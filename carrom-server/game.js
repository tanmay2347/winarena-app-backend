import {
  RED, BLACK, QUEEN, MID, PLAY_MIN, PLAY_MAX, PHYS, POCKETS, INNER_R,
  STRIKER_R, COIN_R, SLUG_R, MEN_PER_PLAYER, FOULS, FOUL_LIMIT, STALE_TURNS,
  initialBoard, createWorld, makeQueen, makeSlug, makeStriker, stepWorld,
  isSettled, pocketAt, isLegalPlacement, isLegalBreak, onFoulLine,
  findSlugSpot, makeRng, clamp, dist, dist2
} from './shared/carrom.js';

let roomSeq = 0;

const rnd = (a, b) => a + Math.random() * (b - a);

export class CarromGame {
  /**
   * @param {{id:string, fee:number, players:Array<{id:string,name:string,isBot:boolean}>, onEvent:Function, onFinish:Function}} opts
   */
  constructor({ fee, players, onEvent, onFinish }) {
    this.id = 'r' + (++roomSeq);
    this.fee = fee;
    this.onEvent = onEvent || (() => {});
    this.onFinish = onFinish || (() => {});
    this.rng = makeRng(Date.now() & 0x7fffffff);
    this.createdAt = Date.now();
    this.status = 'playing';
    this.winner = null;
    this.result = null;
    this.log = [];

    this.players = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      isBot: !!p.isBot,
      color: i === 0 ? RED : BLACK,
      pocketed: 0,
      score: 0,
      fouls: 0,
      coveredQueen: false,
      connected: true,
      shots: 0
    }));

    this.turnIndex = 0;
    this.shotNo = 1;               // strike number of the current game
    this.isBreak = true;
    this.emptyTurns = 0;
    this.phase = 'place';
    this.breakSide = this.players[0].isBot ? 1 : 0;   // human breaks from the left
    this.strikerPlaced = false;
    this.lastStrikerPos = null;
    this.pendingRemoval = [];      // pieces to be re-used (slugs / covered coin)
    this.pocketHistory = [];

    this.world = createWorld(initialBoard());
    this.world.striker.color = this.players[0].color;
    this.world.striker.x = MID - 24;
    this.world.striker.y = MID;
    this.strikerPlaced = false;

    this._lastTick = 0;
    this._acc = 0;
    this._stillFrames = 0;
    this._shotFrames = 0;
    this._timer = null;
    this._startTime = 0;

    this.pushLog('Game started. ' + this.players[0].name + ' (' + RED + ') breaks.');
  }

  /* ---------------- helpers ------------------------------------- */
  get current() { return this.players[this.turnIndex]; }
  get opponent() { return this.players[1 - this.turnIndex]; }
  playerIndex(id) { return this.players.findIndex(p => p.id === id); }
  byId(id) { return this.players.find(p => p.id === id) || null; }
  me() { return this.current; }
  coinsOnBoard(color) {
    return this.world.pieces.filter(p => !p.out && p.kind === 'coin' && (!color || p.color === color)).length;
  }
  queenOnBoard() { return this.world.pieces.some(p => !p.out && p.kind === 'queen'); }
  slugsOnBoard() { return this.world.pieces.filter(p => !p.out && p.kind === 'slug').length; }
  isBotTurn() { return this.current.isBot && this.current.connected; }

  pushLog(text, kind = 'info') {
    this.log.push({ text, kind, ts: Date.now() });
    if (this.log.length > 60) this.log.shift();
  }

  /* ---------------- placement ----------------------------------- */
  legalPlacementFor(idx) {
    if (this.isBreak) {
      for (const s of [0, 1, 2, 3]) {
        if (isLegalBreak(this.world.striker.x, this.world.striker.y, s)) return true;
      }
      return isLegalBreak(this.world.striker.x, this.world.striker.y, this.breakSide);
    }
    return isLegalPlacement(this.world.striker.x, this.world.striker.y);
  }

  placeStriker(playerId, x, y) {
    if (this.status !== 'playing' || this.phase !== 'place') return { ok: false, error: 'Not your turn to place.' };
    if (playerId !== this.current.id) return { ok: false, error: 'Wait for your turn.' };
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: 'Bad position' };
    x = clamp(x, PLAY_MIN + STRIKER_R, PLAY_MAX - STRIKER_R);
    y = clamp(y, PLAY_MIN + STRIKER_R, PLAY_MAX - STRIKER_R);
    if (!isLegalPlacement(x, y)) {
      return { ok: false, error: 'Striker cannot be placed inside a pocket.' };
    }
    if (this.isBreak && !isLegalBreak(x, y, this.breakSide)) {
      const anySide = [0, 1, 2, 3].some(s => isLegalBreak(x, y, s));
      if (!anySide) return { ok: false, error: 'Break shot: place the striker on the line, behind the circle.', code: 'BREAK_ZONE' };
      if (dist(x, y, MID, MID) < INNER_R + STRIKER_R) return { ok: false, error: 'Break shot: striker must sit outside the inner circle.' };
    }
    this.world.striker.x = x;
    this.world.striker.y = y;
    this.world.striker.vx = this.world.striker.vy = 0;
    this.world.striker.color = this.current.color;
    this.strikerPlaced = true;
    this.lastStrikerPos = { x, y };
    this.broadcast();
    return { ok: true };
  }

  /* ---------------- shooting ------------------------------------ */
  shoot(playerId, dx, dy, power) {
    if (this.status !== 'playing' || this.phase !== 'place') return { ok: false, error: 'Not your turn.' };
    if (playerId !== this.current.id) return { ok: false, error: 'Wait for your turn.' };
    if (!this.strikerPlaced) return { ok: false, error: 'Place your striker first.' };
    const len = Math.hypot(dx, dy);
    if (len < 0.05 || power <= 0.02) return { ok: false, error: 'Aim and pull back to shoot.' };

    this.strikerBefore = { x: this.world.striker.x, y: this.world.striker.y };
    this.wasBreak = this.isBreak;
    this.coinsOnFoulLine = new Set();
    for (const p of this.world.pieces) {
      if (!p.out && p.kind === 'coin' && onFoulLine(p.x, p.y)) this.coinsOnFoulLine.add(p.key);
    }
    this.queenPocketedThisShot = false;
    this.shotPocketed = [];

    const speed = clamp(power, 0, 1) * PHYS.maxShotPower;
    this.world.striker.vx = (dx / len) * speed;
    this.world.striker.vy = (dy / len) * speed;
    this.world.striker.color = this.current.color;
    this.phase = 'shot';
    this.current.shots += 1;
    this.isBreak = false;
    this._stillFrames = 0;
    this._shotFrames = 0;
    this._acc = 0;
    this._lastTick = Date.now();
    this._startTime = Date.now();
    this.onEvent(this, { type: 'shot-start', player: this.current.id });
    this._timer = setInterval(() => this._tick(), 8);
    this._tick();
    return { ok: true };
  }

  _tick() {
    if (this.status !== 'playing') return this._stopTimer();
    const now = Date.now();
    let dt = (now - this._lastTick) / 1000;
    this._lastTick = now;
    dt = Math.min(dt, 0.08);
    this._acc += dt;

    let steps = 0;
    while (this._acc >= PHYS.dt && steps < 24) {
      stepWorld(this.world);
      this._acc -= PHYS.dt;
      steps++;
      this._shotFrames++;
      this._drainEvents();
      if (this._shotFrames > PHYS.maxStunFrames) {
        this._forceSettle();
        return;
      }
    }
    if (steps) this.onEvent(this, { type: 'tick' });

    if (isSettled(this.world)) {
      this._stillFrames++;
      if (this._stillFrames > 2) this._finishShot();
    } else {
      this._stillFrames = 0;
    }
  }

  _drainEvents() {
    const ev = this.world.events;
    if (!ev.length) return;
    for (const e of ev) {
      if (e.type === 'pocket') {
        if (e.kind === 'striker') {
          this.shotPocketed.push({ kind: 'striker' });
        } else if (e.kind === 'queen') {
          this.queenPocketedThisShot = true;
          this.shotPocketed.push({ kind: 'queen' });
        } else if (e.kind === 'slug') {
          this.shotPocketed.push({ kind: 'slug' });
        } else {
          this.shotPocketed.push({ kind: 'coin', color: e.color, id: e.id });
        }
      }
    }
    ev.length = 0;
  }

  _forceSettle() {
    for (const p of this.world.pieces) { p.vx = 0; p.vy = 0; }
    this.world.striker.vx = this.world.striker.vy = 0;
    this._finishShot();
  }

  _stopTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  /* ---------------- shot resolution ------------------------------ */
  _finishShot() {
    this._stopTimer();
    this._drainEvents();
    this.shotNo += 1;
    const me = this.current;
    const opp = this.opponent;
    const pocketed = this.shotPocketed.slice();
    this.shotPocketed = [];

    const ownCoins = pocketed.filter(p => p.kind === 'coin' && p.color === me.color);
    const oppCoins = pocketed.filter(p => p.kind === 'coin' && p.color === opp.color);
    const queenOut = pocketed.some(p => p.kind === 'queen');
    const strikerOut = pocketed.some(p => p.kind === 'striker');

    const outcome = {
      pocketed, own: ownCoins.length, opponent: oppCoins.length,
      queen: queenOut, foul: null, text: '', kind: 'miss',
      points: 0, player: me.id
    };

    /* ---- slugs: every pocketed coin drops a carrom man on board --- */
    const coinsPocketed = ownCoins.length + oppCoins.length;
    const queenCoins = queenOut ? 1 : 0;

    const addSlugs = (n) => {
      for (let i = 0; i < n; i++) {
        if (this.slugsOnBoard() >= 10) break;
        if (this.coinsOnBoard() <= 2) break;         // stop near the end
        const spot = findSlugSpot(this.world, this.rng);
        if (spot) this.world.pieces.push(makeSlug(spot.x, spot.y));
      }
    };

    /* ---- foul accounting ---------------------------------------- */
    const foul = (code) => {
      outcome.foul = FOULS[code];
      outcome.kind = 'foul';
      me.fouls += 1;
      opp.score += 1;
      outcome.points = 0;
      outcome.opponentPoint = 1;
      this.pushLog(`${me.name}: ${FOULS[code].text}`, 'foul');
      return false;
    };

    let continues = false;

    if (ownCoins.length || oppCoins.length || queenOut) {
      /* -------- the medallion break: nothing may drop ------------ */
      if (this.wasBreak && (ownCoins.length || oppCoins.length || queenOut)) {
        for (const p of this.world.pieces) {
          if (p.out && p.kind === 'coin' && ownCoins.some(c => c.id === p.id)) { p.out = false; this._recentre(p, 7.2); }
          if (p.out && p.kind === 'coin' && oppCoins.some(c => c.id === p.id)) { p.out = false; this._recentre(p, 7.2); }
          if (p.out && p.kind === 'queen') { p.out = false; p.x = MID; p.y = MID; p.vx = p.vy = 0; }
        }
        foul('OPPONENT_COIN');
        outcome.text = 'Nothing can be pocketed on the break.';
        outcome.kind = 'foul';
        outcome.foul = FOULS.OPPONENT_COIN;
        this.pushLog('Coins pocketed on the break are returned to the centre.', 'foul');
      } else if (queenOut) {
        const myCoinsLeft = this.coinsOnBoard(me.color);
        if (ownCoins.length) {
          /* -------- cover the queen -------------------------------- */
          me.coveredQueen = true;
          me.pocketed += ownCoins.length;
          me.score += ownCoins.length;
          outcome.points = ownCoins.length;
          outcome.kind = 'cover';
          outcome.text = `${me.name} covers the queen!`;
          this.pushLog(`${me.name} covered the queen with ${ownCoins.length} coin(s).`, 'good');
          if (myCoinsLeft <= 0) {
            // last coin + cover => win, the covering coin comes back out
            this._returnCoverCoin(me);
            continues = false;
            this._finish(me.id, 'All coins pocketed and the queen covered.');
            return this._afterShot(outcome);
          }
          continues = true;
        } else {
          /* -------- queen alone ----------------------------------- */
          if (myCoinsLeft === 0 && opp.coinsOnBoardHint === 0) { /* unreachable */ }
          if (myCoinsLeft === 0) {
            me.coveredQueen = true;
            outcome.kind = 'cover';
            outcome.text = `${me.name} pockets the final queen!`;
            this._finish(me.id, 'Queen pocketed as the last piece on the board.');
            return this._afterShot(outcome);
          }
          this._returnQueenToCentre();
          foul('QUEEN_ALONE');
          outcome.text = 'The queen returns to the centre.';
        }
      } else if (oppCoins.length) {
        this._returnPocketed(oppCoins, me);        // give them back
        foul('OPPONENT_COIN');
        outcome.text = `${me.name} pocketed ${oppCoins.length} of ${opp.name}'s coins.`;
      } else {
        /* -------- plain valid shot -------------------------------- */
        me.pocketed += ownCoins.length;
        me.score += ownCoins.length;
        outcome.points = ownCoins.length;

        /* last coin without covering the queen is a foul */
        if (this.coinsOnBoard(me.color) === 0 && !me.coveredQueen) {
          me.pocketed -= ownCoins.length;
          me.score -= ownCoins.length;
          for (const c of ownCoins) {
            const p = this.world.pieces.find(x => x.id === c.id);
            if (p) { p.out = false; this._recentre(p, 6.0); }
          }
          foul('QUEEN_UNCOVERED');
          outcome.text = `${me.name} potted the last coin without covering the queen.`;
          continues = false;
        } else {
          outcome.kind = 'good';
          outcome.text = ownCoins.length > 1
            ? `${me.name} pockets ${ownCoins.length} coins!`
            : `${me.name} pockets a coin.`;
          this.pushLog(outcome.text, 'good');
          continues = true;
        }
      }
    } else if (strikerOut) {
      foul('STRIKER_POCKET');
      outcome.text = 'The striker went down a pocket.';
    } else {
      /* -------- moved a coin that was sitting on a foul line ------- */
      let movedOff = null;
      for (const key of this.coinsOnFoulLine || []) {
        const p = this.world.pieces.find(x => x.key === key);
        if (p && !p.out && !onFoulLine(p.x, p.y)) { movedOff = p; break; }
      }
      if (movedOff) {
        foul('OFF_FOUL_LINE');
        outcome.text = 'A coin that was on a foul line was moved away.';
      } else {
        outcome.text = `${me.name} misses.`;
        outcome.kind = 'miss';
        this.emptyTurns += 1;
      }
    }

    addSlugs(coinsPocketed + queenCoins);

    /* -------- queen left alone on the board? --------------------- */
    if (this.status === 'playing' && this.coinsOnBoard() === 0 && this.queenOnBoard()) {
      this.queenShowdown = true;
      this.pushLog('Only the queen is left — ' + this.current.name + ' must pot it!', 'alert');
    }

    /* -------- foul / stale limits -------------------------------- */
    if (this.status === 'playing' && me.fouls >= FOUL_LIMIT) {
      const draw = me.fouls === opp.fouls;
      this._finish(draw ? null : opp.id, draw
        ? 'Draw — both players reached the foul limit.'
        : `${me.name} reached the foul limit.`);
      return this._afterShot(outcome);
    }
    if (this.status === 'playing' && this.emptyTurns >= STALE_TURNS) {
      const same = me.score === opp.score;
      this._finish(same ? null : (me.score > opp.score ? me.id : opp.id), 'Draw — too many empty turns.');
      return this._afterShot(outcome);
    }

    this._afterShot(outcome, continues);
  }

  _afterShot(outcome, continues) {
    if (this.status !== 'playing') {
      this.phase = 'over';
      this.broadcast(outcome);
      return;
    }
    this.turnIndex = continues ? this.turnIndex : 1 - this.turnIndex;
    this.phase = 'place';
    this.strikerPlaced = false;
    if (this.lastStrikerPos) {
      this.world.striker.x = this.lastStrikerPos.x;
      this.world.striker.y = this.lastStrikerPos.y;
      this.world.striker.vx = this.world.striker.vy = 0;
    }
    if (this.queenShowdown && continues === false) {
      // the player who faces the lone queen gets one shot
    }
    this.lastOutcome = outcome;
    this.broadcast(outcome);
  }

  _returnPocketed(list, toPlayer) {
    // opponent coins that were illegally pocketed go back on the board
    for (const c of list) {
      const p = this.world.pieces.find(x => x.id === c.id);
      if (p) { p.out = false; this._recentre(p, 6.0); }
    }
  }

  _returnQueenToCentre() {
    const q = this.world.pieces.find(p => p.kind === 'queen');
    if (q) { q.out = false; q.x = MID; q.y = MID; q.vx = q.vy = 0; }
  }

  _returnCoverCoin(player) {
    const p = this.world.pieces.find(x => x.out && x.kind === 'coin' && x.color === player.color);
    if (p) { p.out = false; this._recentre(p, 5.2); }
  }

  _recentre(p, radius) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius + Math.random() * 5;
      const x = clamp(MID + Math.cos(a) * r, PLAY_MIN + p.r, PLAY_MAX - p.r);
      const y = clamp(MID + Math.sin(a) * r, PLAY_MIN + p.r, PLAY_MAX - p.r);
      if (pocketAt(x, y)) continue;
      let ok = true;
      for (const q of this.world.pieces) {
        if (q === p || q.out) continue;
        if (dist2(x, y, q.x, q.y) < (q.r + p.r + 0.05) ** 2) { ok = false; break; }
      }
      if (!ok) continue;
      p.x = x; p.y = y; p.vx = p.vy = 0;
      return;
    }
    p.x = MID; p.y = MID; p.vx = p.vy = 0;
  }

  /* ---------------- finishing ----------------------------------- */
  _finish(winnerId, reason) {
    if (this.status !== 'playing') return;
    this.status = 'over';
    this._stopTimer();
    this.phase = 'over';
    this.winner = winnerId;
    this.result = {
      winnerId,
      reason: reason || 'Game over.',
      players: this.players.map(p => ({
        id: p.id, name: p.name, color: p.color, pocketed: p.pocketed,
        score: p.score, fouls: p.fouls, isBot: p.isBot
      }))
    };
    this.pushLog(reason, 'alert');
    this.onFinish(this, this.result);
  }

  /** Force-finish (disconnect / admin). */
  forfeit(playerId, reason = 'Player left the game.') {
    if (this.status !== 'playing') return;
    const idx = this.playerIndex(playerId);
    if (idx < 0) return;
    this._finish(this.players[1 - idx].id, reason);
  }

  setConnected(playerId, connected) {
    const p = this.byId(playerId);
    if (p) p.connected = connected;
  }

  /* ---------------- serialisation -------------------------------- */
  piecesSnapshot() {
    const out = [];
    for (const p of this.world.pieces) {
      if (p.out) continue;
      out.push({ k: p.key, c: p.color, kind: p.kind, x: +p.x.toFixed(2), y: +p.y.toFixed(2) });
    }
    return out;
  }

  tickSnapshot() {
    const out = [];
    for (const p of this.world.pieces) {
      if (p.out) continue;
      out.push([p.key, +p.x.toFixed(2), +p.y.toFixed(2)]);
    }
    return out;
  }

  state(outcome) {
    return {
      roomId: this.id,
      status: this.status,
      phase: this.phase,
      turn: this.current.id,
      turnIndex: this.turnIndex,
      isBreak: this.isBreak,
      breakSide: this.breakSide,
      queenShowdown: !!this.queenShowdown,
      strikerPlaced: this.strikerPlaced,
      shotNo: this.shotNo,
      fee: this.fee,
      players: this.players.map(p => ({
        id: p.id, name: p.name, color: p.color, isBot: p.isBot,
        pocketed: p.pocketed, score: p.score, fouls: p.fouls,
        coveredQueen: p.coveredQueen, connected: p.connected
      })),
      pieces: this.piecesSnapshot(),
      striker: this.world.striker.out
        ? null
        : { x: +this.world.striker.x.toFixed(2), y: +this.world.striker.y.toFixed(2), color: this.current.color },
      lastOutcome: outcome || this.lastOutcome || null,
      result: this.result,
      log: this.log.slice(-8)
    };
  }

  broadcast(outcome) {
    this.onEvent(this, { type: 'state', state: this.state(outcome) });
  }

  destroy() {
    this._stopTimer();
  }
}

export function makeRoom({ fee, players, onEvent, onFinish }) {
  return new CarromGame({ fee, players, onEvent, onFinish });
}
