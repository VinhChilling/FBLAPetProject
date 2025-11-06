/* Virtual Pet Addon — non-invasive extension for the existing app
   Features:
   - Header: Auto-feed toggle (+ settings)
   - Actions tab: Training Plans panel
   - Pets tab: Pet Diary panel
   - Goals tab: Extra chore "Car wash"
   - Shop: Summer sale 20% off toys at checkout
*/
(function(){
  const Addon = {
    settings: { autoFeed: false, autoFeedThreshold: 80, autoFeedType: 'kibble' },
    _choresBound: false,

    loadSettings(){
      try {
        const s = JSON.parse(localStorage.getItem('vpet-addon') || '{}');
        Object.assign(this.settings, s);
      } catch(e){}
    },
    saveSettings(){ localStorage.setItem('vpet-addon', JSON.stringify(this.settings)); },

    afterAdvance(){
      if (!this.settings.autoFeed || !window.Game) return;
      const state = Game.state;
      if (!state || !state.pets || !state.pets.length) return;

      let didSomething = false;
      state.pets.forEach(p => {
        if (p.hunger >= this.settings.autoFeedThreshold){
          const kind = this.settings.autoFeedType;
          const base = PRICES.food[kind];
          let cost = base;
          // Try to spend (Food category). No time advance here.
          if (Game.spend(cost, CATEGORIES.Food)){
            // Mirror the effects of Pet.feed(kind) without advancing time.
            let dh = -35, mh = +4, hh = +4;
            if (kind === 'premium'){ dh = -50; mh = +8; hh = +6; }
            if (kind === 'treat'){ dh = -15; mh = +10; hh = 0; }

            const mods = p.dietMods();
            hh += mods.feedHealth;
            mh += mods.feedHappiness;
            if (kind==='treat' && p.dietPlan==='grainfree') mh -= 2;

            p.hunger = clamp(p.hunger + dh);
            p.happiness = clamp(p.happiness + mh);
            p.health = clamp(p.health + hh);
            p.xp += 2;
            p.levelCheck();

            Game.toast(`Auto-fed ${p.name} (${kind}).`, 'good');
            didSomething = true;
          }
        }
      });

      if (didSomething){
        if (Game.save) Game.save();
        Game.render();
      }
    },

    ensureHeaderToggle(){
      const header = document.querySelector('header');
      if (!header || document.getElementById('addonAutoFeedWrap')) return;

      const label = document.createElement('label');
      label.className = 'small';
      label.id = 'addonAutoFeedWrap';
      label.style.marginLeft = '8px';
      label.innerHTML = `
        <input type="checkbox" id="addonAutoFeedCb"> Auto-feed
        <select id="addonAutoFeedType" style="margin-left:6px">
          <option value="kibble">kibble</option>
          <option value="premium">premium</option>
          <option value="treat">treat</option>
        </select>
        <span class="muted">when hunger ≥</span>
        <input type="number" id="addonAutoFeedThr" min="10" max="95" step="5" style="width:64px">
      `;
      header.appendChild(label);

      const cb  = document.getElementById('addonAutoFeedCb');
      const typ = document.getElementById('addonAutoFeedType');
      const thr = document.getElementById('addonAutoFeedThr');

      cb.checked = this.settings.autoFeed;
      typ.value  = this.settings.autoFeedType;
      thr.value  = this.settings.autoFeedThreshold;

      cb.addEventListener('change', ()=>{
        this.settings.autoFeed = cb.checked;
        this.saveSettings();
        Game.toast(this.settings.autoFeed ? 'Auto-feed ON' : 'Auto-feed OFF');
      });
      typ.addEventListener('change', ()=>{
        this.settings.autoFeedType = typ.value;
        this.saveSettings();
      });
      thr.addEventListener('change', ()=>{
        let v = parseInt(thr.value || 80);
        v = Math.max(10, Math.min(95, v));
        this.settings.autoFeedThreshold = v;
        thr.value = v;
        this.saveSettings();
      });
    },

    ensureSaleBanner(){
      const tab = document.getElementById('tab-shop');
      if (!tab) return;
      let banner = document.getElementById('addonSaleBanner');
      const inSale = Game.state.season() === 'Summer';

      if (inSale){
        if (!banner){
          banner = document.createElement('div');
          banner.id = 'addonSaleBanner';
          banner.className = 'panel';
          banner.innerHTML = `<div class="good"><strong>Summer Sale:</strong> Toys 20% off automatically at checkout!</div>`;
          tab.insertBefore(banner, tab.firstElementChild);
        }
      } else if (banner){
        banner.remove();
      }
    },

    ensureTrainingPanel(){
      const tab = document.getElementById('tab-actions');
      if (!tab || document.getElementById('addonTraining')) return;

      const panel = document.createElement('div');
      panel.id = 'addonTraining';
      panel.className = 'panel';
      panel.innerHTML = `
        <h3>Training Plans (Addon)</h3>
        <div class="row">
          <button class="btn" data-training="agility">Agility Drills</button>
          <button class="btn" data-training="focus">Focus Training</button>
          <button class="btn" data-training="trickshot">Trick Shot</button>
        </div>
        <div class="footnote">Training consumes energy, increases XP, and boosts happiness a bit.</div>
      `;
      tab.appendChild(panel);

      panel.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-training]');
        if (!btn) return;
        const p = Game.activePet();
        if (!p){ Game.toast('Select a pet first','warn'); return; }

        const type = btn.dataset.training;
        let dE=-12, dHap=+6, dXP=+10, dHun=+8, dClean=-5;
        if (type==='focus'){ dE=-8; dHap=+4; dXP=+12; dHun=+6; dClean=-3; }
        if (type==='trickshot'){ dE=-16; dHap=+10; dXP=+16; dHun=+10; dClean=-8; }

        if (p.energy + dE < 10){ Game.toast(`${p.name} is too tired for that.`, 'warn'); return; }
        p.energy      = clamp(p.energy + dE);
        p.happiness   = clamp(p.happiness + dHap);
        p.xp         += dXP;
        p.hunger      = clamp(p.hunger + dHun);
        p.cleanliness = clamp(p.cleanliness + dClean);
        p.levelCheck();

        Game.advanceHours(1);
        Game.toast(`${p.name} completed ${type} training!`, 'good');
        Game.render();
      });
    },

    ensureDiaryPanel(){
      const tab = document.getElementById('tab-pets');
      if (!tab) return;

      let panel = document.getElementById('addonDiary');
      if (!panel){
        panel = document.createElement('div');
        panel.id = 'addonDiary';
        panel.className = 'panel';
        panel.innerHTML = `
          <h3>Pet Diary (Addon)</h3>
          <textarea id="addonDiaryText" rows="4" style="width:100%" placeholder="Notes about your pet..."></textarea>
          <div class="small muted">Saved automatically per pet.</div>
        `;
        tab.appendChild(panel);

        panel.addEventListener('input', (e)=>{
          if (e.target.id === 'addonDiaryText'){
            const p = Game.activePet();
            if (!p) return;
            p.diary = e.target.value; // persists via Game.save
            if (Game.save) Game.save();
          }
        });
      }

      // Update textarea with currently selected pet’s diary
      const p  = Game.activePet();
      const ta = document.getElementById('addonDiaryText');
      if (ta && p){ ta.value = p.diary || ''; }
    },

    ensureCarwashChore(){
      const list = document.getElementById('chores');
      if (!list || document.getElementById('addonCarwashRow')) return;

      const row = document.createElement('div');
      row.id = 'addonCarwashRow';
      row.className = 'row';
      row.style.marginBottom = '6px';
      row.innerHTML = `
        <div class="grow">Car wash (+16–26)</div>
        <button class="btn" data-chore="carwash">Do</button>
      `;
      list.appendChild(row);

      // Bind once (global delegation) for our custom chore
      if (!this._choresBound){
        document.addEventListener('click', (e)=>{
          const btn = e.target.closest('button[data-chore="carwash"]');
          if (!btn) return;
          Game.state.earn(16, 26, -14, -6);
          Game.toast('Car wash done. Earned bonus tips!', 'good');
        });
        this._choresBound = true;
      }
    },

    render(){
      this.ensureHeaderToggle();
      this.ensureSaleBanner();
      this.ensureTrainingPanel();
      this.ensureDiaryPanel();
      this.ensureCarwashChore();

      // Keep header toggle synced with settings
      const cb  = document.getElementById('addonAutoFeedCb');
      const typ = document.getElementById('addonAutoFeedType');
      const thr = document.getElementById('addonAutoFeedThr');
      if (cb)  cb.checked = this.settings.autoFeed;
      if (typ) typ.value  = this.settings.autoFeedType;
      if (thr) thr.value  = this.settings.autoFeedThreshold;
    }
  };

  function boot(){
    if (!window.Game){
      console.warn('Addon: Game not found.');
      return;
    }
    Addon.loadSettings();

    // Wrap core methods safely
    const originalRender   = Game.render.bind(Game);
    const originalAdvance  = Game.advanceHours.bind(Game);
    const originalSpend    = Game.spend.bind(Game);

    Game.render = function(){
      originalRender();
      Addon.render();
    };
    Game.advanceHours = function(h){
      originalAdvance(h);
      Addon.afterAdvance();
    };
    Game.spend = function(amount, category){
      try {
        // Summer sale: 20% off toys
        if (category === CATEGORIES.Toys && Game.state.season() === 'Summer'){
          amount = Math.round(amount * 0.8);
        }
      } catch(e){}
      return originalSpend(amount, category);
    };

    // First paint
    Addon.render();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(boot, 0);
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
