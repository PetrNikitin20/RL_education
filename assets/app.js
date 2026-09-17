"use strict";

const $ = (s) => document.querySelector(s);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmt = (x, n = 2) => Number(x).toFixed(n);
const rng = (() => { let s = 20260917; return () => ((s = Math.imul(48271, s) % 2147483647) & 2147483647) / 2147483647; })();
const normal = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-9))) * Math.cos(2 * Math.PI * rng());

function chart(canvas, series, options = {}) {
  const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#0a1220"; ctx.fillRect(0, 0, w, h);
  const pad = { l: 48, r: 18, t: 18, b: 32 }, flat = series.flatMap(s => s.data);
  const min = options.min ?? Math.min(...flat, 0), max = options.max ?? Math.max(...flat, 1), range = max - min || 1;
  ctx.strokeStyle = "#23324b"; ctx.lineWidth = 1; ctx.fillStyle = "#75849e"; ctx.font = "11px Consolas";
  for (let i = 0; i <= 4; i++) { const y = pad.t + (h - pad.t - pad.b) * i / 4; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); const v = max - range * i / 4; ctx.fillText(options.percent ? `${fmt(v,0)}%` : fmt(v, options.decimals ?? 1), 4, y + 4); }
  series.forEach(s => { if (s.data.length < 2) return; ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 3; ctx.setLineDash(s.dash || []); s.data.forEach((v, i) => { const x = pad.l + (w - pad.l - pad.r) * i / Math.max(1, s.data.length - 1), y = pad.t + (max - v) / range * (h - pad.t - pad.b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); });
}

// Bandit
const bandit = { probs: [.18, .37, .62, .44], counts: [0,0,0,0], values: [0,0,0,0], alpha:[1,1,1,1], beta:[1,1,1,1], steps:0, reward:0, regret:0, rewards:[0], regrets:[0], last:-1 };
function betaSample(a,b){ const x = -Math.log(Math.max(rng(),1e-9))/a, y=-Math.log(Math.max(rng(),1e-9))/b; return x/(x+y); }
function renderBanditInputs(){ const host=$("#armInputs"); host.innerHTML=""; bandit.probs.forEach((p,i)=>{const l=document.createElement("label");l.innerHTML=`A${i+1}<input type="number" min="0.01" max="0.99" step="0.01" value="${p}">`;l.querySelector("input").onchange=e=>{bandit.probs[i]=clamp(+e.target.value,.01,.99);renderBandit()};host.append(l)}); }
function chooseArm(){const mode=$("#banditStrategy").value;if(mode==="epsilon"){if(rng()<+$("#epsilon").value)return Math.floor(rng()*4);return bandit.values.indexOf(Math.max(...bandit.values));}if(mode==="ucb"){if(bandit.counts.includes(0))return bandit.counts.indexOf(0);const scores=bandit.values.map((v,i)=>v+Math.sqrt(2*Math.log(bandit.steps+1)/bandit.counts[i]));return scores.indexOf(Math.max(...scores));}const scores=bandit.alpha.map((a,i)=>betaSample(a,bandit.beta[i]));return scores.indexOf(Math.max(...scores));}
function banditStep(){const a=chooseArm(),r=rng()<bandit.probs[a]?1:0;bandit.last=a;bandit.steps++;bandit.reward+=r;bandit.regret+=Math.max(...bandit.probs)-bandit.probs[a];bandit.counts[a]++;bandit.values[a]+=(r-bandit.values[a])/bandit.counts[a];bandit.alpha[a]+=r;bandit.beta[a]+=1-r;bandit.rewards.push(bandit.reward/bandit.steps);bandit.regrets.push(bandit.regret);renderBandit();}
function renderBandit(){const host=$("#machines");host.innerHTML="";const best=bandit.values.indexOf(Math.max(...bandit.values));bandit.probs.forEach((p,i)=>{const m=document.createElement("div");m.className=`machine ${bandit.steps&&i===best?"best":""}`;m.innerHTML=`<span class="machine-top">ARM ${i+1}</span><div class="reel">${bandit.last===i?(bandit.rewards.at(-1)>bandit.rewards.at(-2)?"◆":"·"):"?"}</div><span class="lever"></span><b>${fmt(bandit.values[i],2)}</b><small>Q · ${bandit.counts[i]} выборов</small>`;host.append(m)});$("#banditSteps").textContent=bandit.steps;$("#banditReward").textContent=bandit.reward;$("#banditRegret").textContent=fmt(bandit.regret,1);$("#banditBest").textContent=bandit.steps?`A${best+1}`:"—";chart($("#banditChart"),[{data:bandit.rewards,color:"#62e4ff"},{data:bandit.regrets.map((x,i)=>i?x/i:0),color:"#ffbd59",dash:[7,6]}],{min:0,max:Math.max(1,...bandit.regrets.map((x,i)=>i?x/i:0))});}
function resetBandit(){Object.assign(bandit,{counts:[0,0,0,0],values:[0,0,0,0],alpha:[1,1,1,1],beta:[1,1,1,1],steps:0,reward:0,regret:0,rewards:[0],regrets:[0],last:-1});renderBandit();}

// Cross-entropy dog and bone: a compact tabular policy is used in-browser for speed and visibility.
const cem={size:9,policy:null,iteration:0,history:[0],dog:[0,0],bone:[8,8],path:[],success:0,mean:0,threshold:0,length:0};
const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
function initPolicy(){cem.size=+$("#gridSize").value;cem.policy=Array.from({length:cem.size*cem.size},()=>[.25,.25,.25,.25]);cem.iteration=0;cem.history=[0];cem.success=0;cem.dog=[0,0];cem.bone=[cem.size-1,cem.size-1];cem.path=[];renderGrid();renderCem();}
function stateId(p){return p[0]*cem.size+p[1]}
function sampleAction(ps){let z=rng(),c=0;for(let i=0;i<ps.length;i++){c+=ps[i];if(z<=c)return i}return ps.length-1}
function episode(greedy=false){let p=[0,0],states=[],actions=[],ret=0,path=[[...p]],max=cem.size*3;for(let t=0;t<max;t++){const st=stateId(p),a=greedy?cem.policy[st].indexOf(Math.max(...cem.policy[st])):sampleAction(cem.policy[st]);states.push(st);actions.push(a);const np=[clamp(p[0]+dirs[a][0],0,cem.size-1),clamp(p[1]+dirs[a][1],0,cem.size-1)];p=np;path.push([...p]);ret+=+$("#stepPenalty").value;if(p[0]===cem.bone[0]&&p[1]===cem.bone[1]){ret+=1;return{states,actions,ret,len:t+1,success:1,path}}}return{states,actions,ret,len:max,success:0,path}}
function trainCem(times=1){for(let z=0;z<times;z++){const n=+$("#sessions").value,sessions=Array.from({length:n},()=>episode()),sorted=sessions.map(x=>x.ret).sort((a,b)=>a-b),threshold=sorted[Math.floor(sorted.length*(+$("#elite").value/100))],elite=sessions.filter(x=>x.ret>=threshold);const counts=Array.from({length:cem.size*cem.size},()=>[.35,.35,.35,.35]);elite.forEach(e=>e.states.forEach((s,i)=>counts[s][e.actions[i]]++));counts.forEach((c,s)=>{const sum=c.reduce((a,b)=>a+b,0);cem.policy[s]=c.map(x=>x/sum)});cem.iteration++;cem.success=sessions.reduce((a,e)=>a+e.success,0)/n;cem.mean=sessions.reduce((a,e)=>a+e.ret,0)/n;cem.threshold=threshold;cem.length=sessions.reduce((a,e)=>a+e.len,0)/n;cem.history.push(cem.success)}renderCem()}
function renderGrid(){const host=$("#dogGrid");host.style.gridTemplateColumns=`repeat(${cem.size},1fr)`;host.innerHTML="";for(let r=0;r<cem.size;r++)for(let c=0;c<cem.size;c++){const x=document.createElement("div"),onPath=cem.path.some(p=>p[0]===r&&p[1]===c);x.className=`cell ${onPath?"path":""} ${cem.dog[0]===r&&cem.dog[1]===c?"dog":""} ${cem.bone[0]===r&&cem.bone[1]===c?"bone":""}`;x.textContent=cem.dog[0]===r&&cem.dog[1]===c?"🐕":cem.bone[0]===r&&cem.bone[1]===c?"🦴":"";host.append(x)}}
function renderCem(){$("#cemIteration").textContent=cem.iteration;$("#cemMean").textContent=fmt(cem.mean,2);$("#cemThreshold").textContent=cem.iteration?fmt(cem.threshold,2):"—";$("#cemLength").textContent=cem.iteration?fmt(cem.length,1):"—";$("#cemSuccess").textContent=`${Math.round(cem.success*100)}%`;$(".score-ring").style.setProperty("--progress",`${cem.success*100}%`);chart($("#cemChart"),[{data:cem.history.map(x=>x*100),color:"#b9f36b"}],{min:0,max:100,percent:true});}
async function playCem(){const e=episode(true);cem.path=[];for(const p of e.path){cem.dog=p;cem.path.push(p);renderGrid();await new Promise(r=>setTimeout(r,90))}}

// Trading simulation. Deterministic pedagogical backtest, not training or advice.
let tradeSeed=0;
function simulateTrading(){tradeSeed++;const regime=$("#marketRegime").value,fee=+$("#fee").value/100,risk=+$("#risk").value/100,algo=$("#tradingAlgo").value,n=180;let price=100,equity=100000,base=100000,position=0,trades=0,peak=equity,maxdd=0,rets=[],prices=[price],eq=[equity],bh=[base];let fast=price,slow=price;const skill={"Q-learning":.54,"DQN":.59,"Double DQN":.63,"Dueling Double DQN":.67}[algo];for(let i=1;i<n;i++){const drift=regime==="trend"?.0007:regime==="sideways"?.00005:.0002,vol=regime==="volatile"?.027:regime==="sideways"?.009:.014,ret=drift+vol*normal();price*=Math.exp(ret);fast=.25*price+.75*fast;slow=.06*price+.94*slow;const signal=(fast-slow)/slow+normal()*(1-skill)*.018;let target=signal>risk*.15?1:signal<-risk*.15?0:position;if(target!==position){equity*=1-fee;trades++;position=target}const prev=equity;equity*=1+position*ret;base*=1+ret;rets.push(equity/prev-1);peak=Math.max(peak,equity);maxdd=Math.max(maxdd,1-equity/peak);prices.push(price);eq.push(equity);bh.push(base)}const mean=rets.reduce((a,b)=>a+b,0)/rets.length,sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/rets.length)||1,sharpe=mean/sd*Math.sqrt(252);chart($("#tradeChart"),[{data:eq,color:"#62e4ff"},{data:bh,color:"#687893",dash:[7,6]}],{min:Math.min(...eq,...bh)*.98,max:Math.max(...eq,...bh)*1.02,decimals:0});$("#equityValue").textContent=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(equity);const ret=(equity/100000-1)*100;$("#tradeReturn").textContent=`${ret>=0?"+":""}${fmt(ret,1)}%`;$("#tradeReturn").className=ret>=0?"positive":"negative";$("#tradeSharpe").textContent=fmt(sharpe,2);$("#tradeDrawdown").textContent=`−${fmt(maxdd*100,1)}%`;$("#tradeCount").textContent=trades;}

// MARL
const marlNews=["ЦБ сохраняет ставку: нейтральный сигнал для риска","Отчётность выше ожиданий: позитивный импульс","Рост геополитической неопределённости: спрос на защитные активы","Инфляция замедляется: поддержка облигаций","Сырьевой шок усиливает волатильность","Деловая активность растёт третий месяц подряд"];
let marlDay=0;
function marlStep(){marlDay++;const market=clamp(.45*Math.sin(marlDay/3)+normal()*.35,-1,1),riskSignal=clamp(-Math.abs(normal())*.55+0.18,-1,1),news=clamp(normal()*.68,-1,1),nw=+$("#newsWeight").value/100,mode=$("#coopMode").value;let score;if(mode==="ctde")score=market*.5+riskSignal*(.5-nw/2)+news*nw;else if(mode==="independent")score=(market+riskSignal+news)/3;else score=[market,riskSignal,news].sort((a,b)=>a-b)[1];const lim=+$("#position").value,stock=clamp(40+score*45,10,lim),bond=clamp(45-riskSignal*22-stock*.18,15,70),cash=100-stock-bond;[["market",market],["risk",riskSignal],["news",news]].forEach(([id,v])=>{$(`#${id}Meter`).value=v;$(`#${id}Signal`).textContent=`${v>=0?"+":""}${fmt(v,2)}`});const decision=score>.18?"INCREASE":score<-.18?"REDUCE":"HOLD";$("#marlDecision").textContent=decision;$("#marlConfidence").textContent=`уверенность ${Math.round(Math.abs(score)*100)}%`;$("#stockAllocation").textContent=`${Math.round(stock)}%`;$("#bondAllocation").textContent=`${Math.round(bond)}%`;$("#cashAllocation").textContent=`${Math.round(cash)}%`;const parts=$(".allocation").children;parts[0].style.width=`${stock}%`;parts[1].style.width=`${bond}%`;parts[2].style.width=`${cash}%`;$("#newsTicker").textContent=`День ${marlDay} · ${marlNews[marlDay%marlNews.length]}`;}

const snippets={
  "rl-loop":{title:"Контракт среды Gymnasium",explain:"Среда отделена от алгоритма: reset() создаёт эпизод, step(action) возвращает наблюдение, награду и два разных признака завершения.",file:"python/cem_dog_bone/env.py",code:`obs, info = env.reset(seed=42)\nfor t in range(horizon):\n    action = agent.act(obs)\n    next_obs, reward, terminated, truncated, info = env.step(action)\n    agent.observe(obs, action, reward, next_obs, terminated)\n    obs = next_obs\n    if terminated or truncated:\n        break`},
  bandit:{title:"ε-greedy агент",explain:"Оценка Q(a) обновляется онлайн как выборочное среднее. ε управляет долей исследовательских действий.",file:"python/bandit/agents.py",code:`def select_action(self):\n    if self.rng.random() < self.epsilon:\n        return self.rng.integers(self.n_arms)\n    return int(np.argmax(self.q))\n\ndef update(self, action, reward):\n    self.n[action] += 1\n    self.q[action] += (reward - self.q[action]) / self.n[action]`},
  cem:{title:"Итерация Cross-Entropy Method",explain:"Обучаем политику не на всех действиях, а на парах «состояние—действие» из эпизодов выше квантильного порога.",file:"python/cem_dog_bone/train.py",code:`sessions = [generate_session(env, policy) for _ in range(batch_size)]\nthreshold = np.percentile([s.reward for s in sessions], percentile)\nelite = [s for s in sessions if s.reward >= threshold]\n\nX = np.concatenate([s.states for s in elite])\ny = np.concatenate([s.actions for s in elite])\npolicy.fit(X, y)`},
  trading:{title:"Dueling Double DQN",explain:"Online-сеть выбирает действие; target-сеть оценивает. Dueling-head разделяет ценность состояния V и относительные преимущества действий A.",file:"python/trading/agent.py",code:`with torch.no_grad():\n    next_action = online(next_state).argmax(1, keepdim=True)\n    next_q = target(next_state).gather(1, next_action)\n    td_target = reward + gamma * (1 - done) * next_q\n\nq = online(state).gather(1, action)\nloss = F.smooth_l1_loss(q, td_target)`},
  marl:{title:"Три агента и координатор",explain:"Каждый агент публикует типизированное предложение. Координатор агрегирует сигналы с учётом доверия и ограничений риска.",file:"python/marl/coordinator.py",code:`proposals = {\n  "market": market_agent.act(observation),\n  "risk": risk_agent.act(observation),\n  "news": news_agent.act(observation),\n}\nscore = sum(p.signal * p.confidence * weights[name]\n            for name, p in proposals.items())\nallocation = risk_agent.project(score, position_limit)`}
};
function openCode(key){const s=snippets[key],dlg=$("#codeDialog");$("#codeTitle").textContent=s.title;$("#codeExplain").textContent=s.explain;$("#codeContent").textContent=s.code;$("#codeFileLink").href=`https://github.com/PetrNikitin20/RL_education/blob/main/${s.file}`;dlg.showModal()}

// Bindings
document.querySelectorAll("[data-open-code]").forEach(b=>b.onclick=()=>openCode(b.dataset.openCode));$("#closeDialog").onclick=()=>$("#codeDialog").close();$("#codeDialog").onclick=e=>{if(e.target===$("#codeDialog"))e.target.close()};
if ($("#epsilon")) {
  $("#epsilon").oninput=e=>$("#epsilonOut").textContent=fmt(e.target.value,2);
  $("#banditStep").onclick=banditStep;
  $("#banditRun").onclick=()=>{for(let i=0;i<200;i++)banditStep()};
  $("#banditReset").onclick=resetBandit;
  renderBanditInputs(); renderBandit();
}
if ($("#gridSize")) {
  [["sessions","sessionsOut",v=>v],["elite","eliteOut",v=>`${v}%`],["stepPenalty","stepPenaltyOut",v=>fmt(v,2)]].forEach(([i,o,f])=>$("#"+i).oninput=e=>$("#"+o).textContent=f(e.target.value));
  $("#gridSize").onchange=initPolicy; $("#cemTrain").onclick=()=>trainCem(1); $("#cemAuto").onclick=()=>trainCem(10); $("#cemReset").onclick=initPolicy; $("#cemPlay").onclick=playCem;
  initPolicy();
}
if ($("#tradingAlgo")) {
  $("#fee").oninput=e=>$("#feeOut").textContent=`${fmt(e.target.value,2)}%`; $("#risk").oninput=e=>$("#riskOut").textContent=`${fmt(e.target.value,1)}%`; $("#tradeRun").onclick=simulateTrading; $("#tradeReset").onclick=simulateTrading;
  simulateTrading();
}
if ($("#coopMode")) {
  $("#newsWeight").oninput=e=>$("#newsWeightOut").textContent=`${e.target.value}%`; $("#position").oninput=e=>$("#positionOut").textContent=`${e.target.value}%`; $("#marlStep").onclick=marlStep; $("#marlRun").onclick=()=>{for(let i=0;i<30;i++)marlStep()};
  marlStep();
}
const captureSection = new URLSearchParams(location.search).get("capture");
if (captureSection) {
  document.querySelectorAll("main > section").forEach(section => section.style.display = section.id === captureSection ? "block" : "none");
  const target = document.getElementById(captureSection);
  if (target) { target.style.paddingTop = "42px"; target.style.borderTop = "0"; }
}
const activeDemo = new URLSearchParams(location.search).get("demo") || "bandit";
if (!captureSection) {
  document.querySelectorAll(".lab").forEach(section => section.hidden = section.id !== activeDemo);
  document.querySelectorAll('a[href*="demo="]').forEach(link => {
    if (link.href.includes(`demo=${activeDemo}`)) link.setAttribute("aria-current", "page");
  });
}
if (location.hash) { document.documentElement.style.scrollBehavior="auto"; requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({block:"start",behavior:"auto"})); }
