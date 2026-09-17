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
function animateChart(canvas, series, options = {}) {
  let points = 2;
  const total = Math.max(...series.map(s => s.data.length));
  const draw = () => {
    chart(canvas, series.map(s => ({...s, data:s.data.slice(0, points)})), options);
    points += Math.max(2, Math.ceil(total / 45));
    if (points <= total + 2) requestAnimationFrame(draw);
  };
  draw();
}
function barChart(canvas, labels, values) {
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,pad={l:34,r:14,t:18,b:48},max=Math.max(1,...values),slot=(w-pad.l-pad.r)/Math.max(1,values.length);
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#0a1220";ctx.fillRect(0,0,w,h);ctx.font="12px Consolas";ctx.textAlign="center";
  values.forEach((v,i)=>{const bh=(h-pad.t-pad.b)*v/max,x=pad.l+i*slot+slot*.16,y=h-pad.b-bh,bw=slot*.68;ctx.fillStyle=i%2?"#4f7cff":"#62e4ff";ctx.fillRect(x,y,bw,bh);ctx.fillStyle="#eef3ff";ctx.fillText(String(v),x+bw/2,Math.max(14,y-7));ctx.fillStyle="#9aa8c2";ctx.fillText(labels[i],x+bw/2,h-19)});
  ctx.textAlign="left";
}
function setConclusion(id, text, tone = "") {
  const target = $(id);
  if (!target) return;
  target.textContent = text;
  target.className = tone;
}
function addAction(logId, text, limit = 7) {
  const log = $(logId);
  if (!log) return;
  const item = document.createElement("li");
  item.textContent = text;
  log.prepend(item);
  while (log.children.length > limit) log.lastElementChild.remove();
}

// Bandit
const bandit = { probs: [.18, .37, .62, .44], counts: [0,0,0,0], values: [0,0,0,0], alpha:[1,1,1,1], beta:[1,1,1,1], steps:0, reward:0, regret:0, rewards:[0], regrets:[0], last:-1, decision:"" };
function betaSample(a,b){ const x = -Math.log(Math.max(rng(),1e-9))/a, y=-Math.log(Math.max(rng(),1e-9))/b; return x/(x+y); }
function renderBanditInputs(){ const host=$("#armInputs"); host.innerHTML=""; bandit.probs.forEach((p,i)=>{const l=document.createElement("label");l.innerHTML=`A${i+1}<input type="number" min="0.01" max="0.99" step="0.01" value="${p}">`;l.querySelector("input").onchange=e=>{bandit.probs[i]=clamp(+e.target.value,.01,.99);renderBandit()};host.append(l)}); }
function chooseArm(){const mode=$("#banditStrategy").value;if(mode==="epsilon"){const explore=rng()<+$("#epsilon").value;bandit.decision=explore?"исследование":"использование";if(explore)return Math.floor(rng()*4);return bandit.values.indexOf(Math.max(...bandit.values));}if(mode==="ucb"){bandit.decision="UCB: оптимизм для редкого действия";if(bandit.counts.includes(0))return bandit.counts.indexOf(0);const scores=bandit.values.map((v,i)=>v+Math.sqrt(2*Math.log(bandit.steps+1)/bandit.counts[i]));return scores.indexOf(Math.max(...scores));}bandit.decision="Thompson: выбор по апостериорной выборке";const scores=bandit.alpha.map((a,i)=>betaSample(a,bandit.beta[i]));return scores.indexOf(Math.max(...scores));}
function banditStep(){const a=chooseArm(),before=bandit.values[a],r=rng()<bandit.probs[a]?1:0,regretStep=Math.max(...bandit.probs)-bandit.probs[a];bandit.last=a;bandit.steps++;bandit.reward+=r;bandit.regret+=regretStep;bandit.counts[a]++;bandit.values[a]+=(r-bandit.values[a])/bandit.counts[a];bandit.alpha[a]+=r;bandit.beta[a]+=1-r;bandit.rewards.push(bandit.reward/bandit.steps);bandit.regrets.push(bandit.regret);renderBandit();const result=r?"получена награда 1":"награда 0";const conclusion=`A${a+1}: ${result}; Q изменилось ${fmt(before,2)} → ${fmt(bandit.values[a],2)}. Режим: ${bandit.decision}.`;setConclusion("#banditInsight",conclusion,r?"good":"warn");addAction("#banditActionLog",`Шаг ${bandit.steps}. ${conclusion} Прирост regret: ${fmt(regretStep,2)}.`);}
function renderBandit(){const host=$("#machines");host.innerHTML="";const best=bandit.values.indexOf(Math.max(...bandit.values));bandit.probs.forEach((p,i)=>{const m=document.createElement("div");m.className=`machine ${bandit.steps&&i===best?"best":""} ${bandit.last===i?"active":""}`;m.innerHTML=`<span class="machine-top">ARM ${i+1}</span><div class="reel">${bandit.last===i?(bandit.rewards.at(-1)>bandit.rewards.at(-2)?"◆":"·"):"?"}</div><span class="lever"></span><b>${fmt(bandit.values[i],2)}</b><small>Q · ${bandit.counts[i]} выборов</small>`;host.append(m)});$("#banditSteps").textContent=bandit.steps;$("#banditReward").textContent=bandit.reward;$("#banditRegret").textContent=fmt(bandit.regret,1);$("#banditBest").textContent=bandit.steps?`A${best+1}`:"—";chart($("#banditChart"),[{data:bandit.rewards,color:"#62e4ff"},{data:bandit.regrets.map((x,i)=>i?x/i:0),color:"#ffbd59",dash:[7,6]}],{min:0,max:Math.max(1,...bandit.regrets.map((x,i)=>i?x/i:0))});}
function resetBandit(){Object.assign(bandit,{counts:[0,0,0,0],values:[0,0,0,0],alpha:[1,1,1,1],beta:[1,1,1,1],steps:0,reward:0,regret:0,rewards:[0],regrets:[0],last:-1,decision:""});$("#banditActionLog").innerHTML="";setConclusion("#banditInsight","Эксперимент сброшен. Выполните новое действие.");renderBandit();}

// Cross-Entropy Method: random start, several bones and configurable action spaces.
const CEM_ACTIONS=[
  {dr:-1,dc:0,name:"вверх",short:"↑"},{dr:1,dc:0,name:"вниз",short:"↓"},{dr:0,dc:-1,name:"влево",short:"←"},{dr:0,dc:1,name:"вправо",short:"→"},
  {dr:-1,dc:-1,name:"по диагонали вверх-влево",short:"↖"},{dr:-1,dc:1,name:"по диагонали вверх-вправо",short:"↗"},{dr:1,dc:-1,name:"по диагонали вниз-влево",short:"↙"},{dr:1,dc:1,name:"по диагонали вниз-вправо",short:"↘"},
  {dr:-2,dc:0,name:"прыжок вверх",short:"⇈"},{dr:2,dc:0,name:"прыжок вниз",short:"⇊"},{dr:0,dc:-2,name:"прыжок влево",short:"⇇"},{dr:0,dc:2,name:"прыжок вправо",short:"⇉"}
];
const cem={size:9,actionCount:8,boneCount:3,policy:null,iteration:0,history:[0],start:[0,0],dog:[0,0],bones:[],visibleBones:[],path:[],success:0,mean:0,threshold:0,length:0,collected:0,playing:false,bestEpisode:null,bestScore:-Infinity,actionUsage:[]};
function sameCell(a,b){return a[0]===b[0]&&a[1]===b[1]}
function randomCells(size,count){const cells=[];while(cells.length<count){const p=[Math.floor(rng()*size),Math.floor(rng()*size)];if(!cells.some(x=>sameCell(x,p)))cells.push(p)}return cells}
function initPolicy(){cem.size=+$("#gridSize").value;cem.actionCount=+$("#actionCount").value;cem.boneCount=+$("#boneCount").value;cem.policy=Array.from({length:cem.size*cem.size},()=>Array(cem.actionCount).fill(1/cem.actionCount));const cells=randomCells(cem.size,cem.boneCount+1);cem.start=cells[0];cem.dog=[...cem.start];cem.bones=cells.slice(1);cem.visibleBones=cem.bones.map(x=>[...x]);cem.iteration=0;cem.history=[0];cem.success=0;cem.mean=0;cem.threshold=0;cem.length=0;cem.path=[];cem.collected=0;cem.bestEpisode=null;cem.bestScore=-Infinity;cem.actionUsage=Array(cem.actionCount).fill(0);$("#cemActionLog").innerHTML="";setConclusion("#cemInsight",`Новая задача: старт (${cem.start.join(", ")}), костей ${cem.boneCount}, действий ${cem.actionCount}.`);renderGrid();renderCem();renderPolicy();renderActionCounts();}
function stateId(p){return p[0]*cem.size+p[1]}
function sampleAction(ps){let z=rng(),c=0;for(let i=0;i<ps.length;i++){c+=ps[i];if(z<=c)return i}return ps.length-1}
function movePoint(p,a){const d=CEM_ACTIONS[a];return[clamp(p[0]+d.dr,0,cem.size-1),clamp(p[1]+d.dc,0,cem.size-1)]}
function distance(a,b){return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))}
function nearestDistance(p,bones){return bones.length?Math.min(...bones.map(b=>distance(p,b))):0}
function heuristicAction(p,bones){let best=0,bestDist=Infinity;for(let a=0;a<cem.actionCount;a++){const np=movePoint(p,a),d=nearestDistance(np,bones);if(d<bestDist&&!sameCell(np,p)){bestDist=d;best=a}}return best}
function episode(mode="sample"){let p=[...cem.start],remaining=cem.bones.map(x=>[...x]),states=[],actions=[],ret=0,path=[{pos:[...p],action:null,reward:0,collected:null}],collected=0,max=cem.size*cem.size+cem.boneCount*cem.size;for(let t=0;t<max;t++){const st=stateId(p);let a;if(mode==="heuristic")a=heuristicAction(p,remaining);else if(mode==="greedy")a=cem.policy[st].indexOf(Math.max(...cem.policy[st]));else a=rng()<.18?heuristicAction(p,remaining):sampleAction(cem.policy[st]);states.push(st);actions.push(a);const before=nearestDistance(p,remaining),np=movePoint(p,a),after=nearestDistance(np,remaining);let reward=+$("#stepPenalty").value;if(sameCell(np,p))reward-=.03;if(after<before)reward+=.01;p=np;let collectedBone=null;const hit=remaining.findIndex(b=>sameCell(b,p));if(hit>=0){collectedBone=remaining[hit];remaining.splice(hit,1);collected++;reward+=.25;if(!remaining.length)reward+=2}ret+=reward;path.push({pos:[...p],action:a,reward,collected:collectedBone});if(!remaining.length)return{states,actions,ret,len:t+1,success:1,collected,path}}return{states,actions,ret,len:max,success:0,collected,path}}
function trainCem(times=1){const before=cem.success;for(let z=0;z<times;z++){const n=+$("#sessions").value,sessions=Array.from({length:n},()=>episode("sample"));sessions.push(episode("heuristic"));const sorted=sessions.map(x=>x.ret).sort((a,b)=>a-b),threshold=sorted[Math.floor(sorted.length*(+$("#elite").value/100))],elite=sessions.filter(x=>x.ret>=threshold),counts=Array.from({length:cem.size*cem.size},()=>Array(cem.actionCount).fill(.25));elite.forEach(e=>e.states.forEach((s,i)=>counts[s][e.actions[i]]++));counts.forEach((c,s)=>{const sum=c.reduce((a,b)=>a+b,0);cem.policy[s]=c.map(x=>x/sum)});const candidate=sessions.reduce((best,e)=>(e.collected*100+e.ret>best.collected*100+best.ret?e:best),sessions[0]);const score=candidate.collected*100+candidate.ret;if(score>cem.bestScore){cem.bestScore=score;cem.bestEpisode=candidate}cem.iteration++;cem.success=sessions.reduce((a,e)=>a+e.success,0)/sessions.length;cem.mean=sessions.reduce((a,e)=>a+e.ret,0)/sessions.length;cem.threshold=threshold;cem.length=sessions.reduce((a,e)=>a+e.len,0)/sessions.length;cem.history.push(cem.success)}cem.actionUsage=Array(cem.actionCount).fill(0);if(cem.bestEpisode)cem.bestEpisode.actions.forEach(a=>cem.actionUsage[a]++);renderCem();renderPolicy();renderActionCounts();const delta=(cem.success-before)*100,found=cem.bestEpisode?`${cem.bestEpisode.collected}/${cem.boneCount} костей за ${cem.bestEpisode.len} ходов`:"траектория не найдена";const conclusion=`После ${times} итерац${times===1?"ии":"ий"}: полный сбор ${Math.round(cem.success*100)}% (${delta>=0?"+":""}${fmt(delta,0)} п.п.). Лучшая траектория: ${found}.`;setConclusion("#cemInsight",conclusion,cem.bestEpisode?.success?"good":"warn");addAction("#cemActionLog",`Обучение до итерации ${cem.iteration}: ${conclusion}`);}
function renderGrid(){const host=$("#dogGrid");host.style.gridTemplateColumns=`repeat(${cem.size},1fr)`;host.innerHTML="";for(let r=0;r<cem.size;r++)for(let c=0;c<cem.size;c++){const x=document.createElement("div"),p=[r,c],onPath=cem.path.some(q=>sameCell(q,p)),isDog=sameCell(cem.dog,p),isBone=cem.visibleBones.some(q=>sameCell(q,p)),just=cem.justCollected&&sameCell(cem.justCollected,p);x.className=`cell ${onPath?"path":""} ${isDog?"dog":""} ${isBone?"bone":""} ${just?"collected":""}`;x.textContent=isDog?"🐕":isBone?"🦴":"";host.append(x)}}
function renderCem(){$("#cemIteration").textContent=cem.iteration;$("#cemMean").textContent=fmt(cem.mean,2);$("#cemThreshold").textContent=cem.iteration?fmt(cem.threshold,2):"—";$("#cemLength").textContent=cem.iteration?fmt(cem.length,1):"—";$("#cemSuccess").textContent=`${Math.round(cem.success*100)}%`;$("#cemBones").textContent=cem.collected;$("#cemBonesTotal").textContent=cem.boneCount;$(".score-ring").style.setProperty("--progress",`${cem.success*100}%`);chart($("#cemChart"),[{data:cem.history.map(x=>x*100),color:"#b9f36b"}],{min:0,max:100,percent:true});$("#cemPlay").disabled=!cem.bestEpisode||cem.playing;}
function renderPolicy(){const host=$("#cemPolicyTable");host.style.gridTemplateColumns=`repeat(${cem.size},1fr)`;host.innerHTML="";for(let r=0;r<cem.size;r++)for(let c=0;c<cem.size;c++){const p=[r,c],cell=document.createElement("div"),a=cem.policy?cem.policy[stateId(p)].indexOf(Math.max(...cem.policy[stateId(p)])):0;cell.className=`policy-cell ${sameCell(p,cem.start)?"start":""} ${cem.bones.some(b=>sameCell(b,p))?"target":""}`;cell.textContent=sameCell(p,cem.start)?"🐕":cem.bones.some(b=>sameCell(b,p))?"🦴":CEM_ACTIONS[a].short;host.append(cell)}$("#cemActionLegend").textContent=CEM_ACTIONS.slice(0,cem.actionCount).map((a,i)=>`${i}: ${a.short} ${a.name}`).join(" · ");$("#cemPolicySummary").textContent=cem.bestEpisode?`Лучшая найденная траектория собрала ${cem.bestEpisode.collected} из ${cem.boneCount} костей за ${cem.bestEpisode.len} ходов. Возврат ${fmt(cem.bestEpisode.ret,2)}.`:"Выполните обучение. После первой итерации таблица покажет жадное действие в каждой клетке.";}
function renderActionCounts(){barChart($("#cemActionChart"),CEM_ACTIONS.slice(0,cem.actionCount).map(a=>a.short),cem.actionUsage)}
async function playCem(){if(cem.playing||!cem.bestEpisode)return;cem.playing=true;cem.collected=0;cem.dog=[...cem.start];cem.visibleBones=cem.bones.map(x=>[...x]);cem.path=[[...cem.start]];cem.justCollected=null;renderCem();renderGrid();for(let i=1;i<cem.bestEpisode.path.length;i++){const step=cem.bestEpisode.path[i],action=CEM_ACTIONS[step.action];cem.dog=[...step.pos];cem.path.push([...step.pos]);cem.justCollected=step.collected;cem.visibleBones=cem.visibleBones.filter(b=>!step.collected||!sameCell(b,step.collected));if(step.collected)cem.collected++;renderGrid();renderCem();const rewardText=`r=${fmt(step.reward,2)}`;setConclusion("#cemInsight",`Ход ${i}: ${action.name}, клетка (${step.pos.join(", ")}), ${rewardText}${step.collected?" — кость собрана":""}.`,step.collected?"good":"warn");addAction("#cemActionLog",`Ход ${i}: ${action.short} ${action.name}; ${rewardText}${step.collected?"; кость собрана":""}.`,120);await new Promise(r=>setTimeout(r,320));cem.justCollected=null}const complete=cem.collected===cem.boneCount;const conclusion=complete?`Все ${cem.boneCount} костей собраны за ${cem.bestEpisode.len} ходов. Начислена супернаграда +2.`:`Собрано ${cem.collected} из ${cem.boneCount} костей. Нужны дополнительные итерации обучения.`;setConclusion("#cemInsight",conclusion,complete?"good":"warn");addAction("#cemActionLog",conclusion,120);cem.playing=false;renderCem();}

// Trading simulation. Deterministic pedagogical backtest, not training or advice.
let tradeSeed=0;
function simulateTrading(){tradeSeed++;const regime=$("#marketRegime").value,fee=+$("#fee").value/100,risk=+$("#risk").value/100,algo=$("#tradingAlgo").value,n=180;let price=100,equity=100000,base=100000,position=0,trades=0,peak=equity,maxdd=0,rets=[],prices=[price],eq=[equity],bh=[base];let fast=price,slow=price;const skill={"Q-learning":.54,"DQN":.59,"Double DQN":.63,"Dueling Double DQN":.67}[algo];for(let i=1;i<n;i++){const drift=regime==="trend"?.0007:regime==="sideways"?.00005:.0002,vol=regime==="volatile"?.027:regime==="sideways"?.009:.014,ret=drift+vol*normal();price*=Math.exp(ret);fast=.25*price+.75*fast;slow=.06*price+.94*slow;const signal=(fast-slow)/slow+normal()*(1-skill)*.018;let target=signal>risk*.15?1:signal<-risk*.15?0:position;if(target!==position){equity*=1-fee;trades++;position=target}const prev=equity;equity*=1+position*ret;base*=1+ret;rets.push(equity/prev-1);peak=Math.max(peak,equity);maxdd=Math.max(maxdd,1-equity/peak);prices.push(price);eq.push(equity);bh.push(base)}const mean=rets.reduce((a,b)=>a+b,0)/rets.length,sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/rets.length)||1,sharpe=mean/sd*Math.sqrt(252);animateChart($("#tradeChart"),[{data:eq,color:"#62e4ff"},{data:bh,color:"#687893",dash:[7,6]}],{min:Math.min(...eq,...bh)*.98,max:Math.max(...eq,...bh)*1.02,decimals:0});$("#equityValue").textContent=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(equity);const ret=(equity/100000-1)*100,baseRet=(base/100000-1)*100,edge=ret-baseRet;$("#tradeReturn").textContent=`${ret>=0?"+":""}${fmt(ret,1)}%`;$("#tradeReturn").className=ret>=0?"positive":"negative";$("#tradeSharpe").textContent=fmt(sharpe,2);$("#tradeDrawdown").textContent=`−${fmt(maxdd*100,1)}%`;$("#tradeCount").textContent=trades;const verdict=edge>0?`Агент выше Buy & Hold на ${fmt(edge,1)} п.п.`:`Агент ниже Buy & Hold на ${fmt(Math.abs(edge),1)} п.п.`;const caution=maxdd>.2?" Просадка высока, вывод требует осторожности.":" Просадка остаётся умеренной в рамках этой симуляции.";const conclusion=`${algo}, режим «${$("#marketRegime").selectedOptions[0].text}»: ${verdict}${caution}`;setConclusion("#tradeInsight",conclusion,edge>0&&maxdd<=.2?"good":"warn");addAction("#tradeActionLog",`Запуск ${tradeSeed}: доходность ${fmt(ret,1)}%, Sharpe ${fmt(sharpe,2)}, max drawdown ${fmt(maxdd*100,1)}%, сделок ${trades}, комиссия ${fmt(fee*100,2)}%.`);}

// MARL
const marlNews=["ЦБ сохраняет ставку: нейтральный сигнал для риска","Отчётность выше ожиданий: позитивный импульс","Рост геополитической неопределённости: спрос на защитные активы","Инфляция замедляется: поддержка облигаций","Сырьевой шок усиливает волатильность","Деловая активность растёт третий месяц подряд"];
let marlDay=0;
function marlStep(){marlDay++;const market=clamp(.45*Math.sin(marlDay/3)+normal()*.35,-1,1),riskSignal=clamp(-Math.abs(normal())*.55+0.18,-1,1),news=clamp(normal()*.68,-1,1),nw=+$("#newsWeight").value/100,mode=$("#coopMode").value;let score;if(mode==="ctde")score=market*.5+riskSignal*(.5-nw/2)+news*nw;else if(mode==="independent")score=(market+riskSignal+news)/3;else score=[market,riskSignal,news].sort((a,b)=>a-b)[1];const lim=+$("#position").value,rawStock=40+score*45,stock=clamp(rawStock,10,lim),bond=clamp(45-riskSignal*22-stock*.18,15,70),cash=100-stock-bond;[["market",market],["risk",riskSignal],["news",news]].forEach(([id,v])=>{const card=$(`.agent-card.${id}`);card.classList.remove("signal-flash");void card.offsetWidth;card.classList.add("signal-flash");$(`#${id}Meter`).value=v;$(`#${id}Signal`).textContent=`${v>=0?"+":""}${fmt(v,2)}`});const decision=score>.18?"INCREASE":score<-.18?"REDUCE":"HOLD";$("#marlDecision").textContent=decision;const coordinator=$(".coordinator");coordinator.classList.remove("decision-flash");void coordinator.offsetWidth;coordinator.classList.add("decision-flash");$("#marlConfidence").textContent=`уверенность ${Math.round(Math.abs(score)*100)}%`;$("#stockAllocation").textContent=`${Math.round(stock)}%`;$("#bondAllocation").textContent=`${Math.round(bond)}%`;$("#cashAllocation").textContent=`${Math.round(cash)}%`;const parts=$(".allocation").children;parts[0].style.width=`${stock}%`;parts[1].style.width=`${bond}%`;parts[2].style.width=`${cash}%`;const event=marlNews[marlDay%marlNews.length];$("#newsTicker").textContent=`День ${marlDay} · ${event}`;const constrained=rawStock>lim?` Risk Agent ограничил долю акций лимитом ${lim}%.`:" Лимит позиции не активирован.";const conclusion=`${decision}: Market ${fmt(market,2)}, Risk ${fmt(riskSignal,2)}, News ${fmt(news,2)}. Акции ${Math.round(stock)}%.${constrained}`;setConclusion("#marlInsight",conclusion,decision==="INCREASE"?"good":decision==="REDUCE"?"warn":"");addAction("#marlActionLog",`День ${marlDay}: ${conclusion}`);}

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
  ["gridSize","boneCount","actionCount"].forEach(id=>$("#"+id).onchange=initPolicy); $("#cemTrain").onclick=()=>trainCem(1); $("#cemAuto").onclick=()=>trainCem(10); $("#cemReset").onclick=initPolicy; $("#cemPlay").onclick=playCem;
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
