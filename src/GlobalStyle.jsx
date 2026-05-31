import React from "react";

export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    
    * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
    body { background-color: #f8fafc; color: #0f172a; -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width: 0px; } 
    
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .slide-up { animation: slideUp 0.4s cubic-bezier(.17,.67,.21,1); }
    .pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    
    /* MODERNISED NAV-BAR */
    .nav-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(16px); border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0 max(12px, env(safe-area-inset-bottom)); z-index: 50; box-shadow: 0 -8px 32px rgba(0,0,0,0.06); }
    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #94a3b8; font-weight: 800; gap: 6px; transition: all 0.3s ease; width: 20%; }
    .nav-item.active { color: #10b981; }
    
    .nav-icon { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
    .nav-item.active .nav-icon { transform: translateY(-3px) scale(1.1); filter: drop-shadow(0 4px 6px rgba(16,185,129,0.3)); }

    .timeline-line { width: 2px; background: #f1f5f9; position: absolute; top: 14px; bottom: 10px; left: 3px; }
    .timeline-item:last-child .timeline-line { display: none; }
    
    .timeline-main-line { position: absolute; left: 24px; top: 0; bottom: 0; width: 2px; background: #f1f5f9; z-index: 0; }
    .timeline-main-item { position: relative; padding-left: 56px; padding-bottom: 24px; z-index: 10; }
    .timeline-main-icon { position: absolute; left: 10px; top: 0; width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; z-index: 20; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    
    select, input, textarea { appearance: none; -webkit-appearance: none; transition: all 0.2s; }
    select:focus, input:focus, textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

    .splash-container { position: fixed; inset: 0; background: #000; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity 0.8s ease; overflow: hidden; }

    .highlight-blink {
      animation: highlight-blink-anim 1.5s ease-out 3;
    }
    @keyframes highlight-blink-anim {
      0%, 100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
      50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0.4); }
    }
  `}</style>
);