const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const G=require('./calculator-model.js'),B=require('./calculator-bills.js'),I=require('./calculator-income.js'),C=require('./calculator-costs.js'),S=require('./calculator-share.js');
const html=fs.readFileSync('dist/index.html','utf8'),key='savings-plan-public-v1';
const fixture=()=>C.initialise(I.initialise(B.setExample({...G.example(),startMonth:'2099-01',endMonth:'2099-12'})));
function open({saved,url='https://example.test/',storageFailure=false,guided=false,quickDraft}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;const initial=saved||(!guided?{state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'example'}:null);if(initial)w.localStorage.setItem(key,JSON.stringify(initial));if(quickDraft)w.localStorage.setItem('savings-plan-quickstart-v1',JSON.stringify(quickDraft));if(storageFailure)w.Storage.prototype.setItem=()=>{throw new Error('denied');};}});assert.deepEqual(errors,[]);return {dom,d:dom.window.document,errors};
}
function enter(dom,id,value){const el=dom.window.document.getElementById(id);el.focus();el.value=String(value);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.blur();}
const saved=dom=>JSON.parse(dom.window.localStorage.getItem(key));
test('monthly total and additional gap lead the result, and invalid input clears the payday advice',()=>{
 const p=open();assert.equal(p.d.getElementById('monthly-required').textContent,'HKD 25,000.00');assert.equal(p.d.getElementById('monthly-gap').textContent,'HKD 8,800.00');
 assert.deepEqual([...p.d.querySelector('.overview').children].slice(0,3).map(node=>node.id),['goal','payday','forecast-summary']);
 enter(p.dom,'target',120000);assert.equal(p.d.getElementById('monthly-required').textContent,'HKD 10,000.00');assert.equal(p.d.getElementById('monthly-gap').textContent,'');
 enter(p.dom,'taxTotal','');assert.equal(p.d.getElementById('monthly-required').textContent,'—');assert.equal(p.d.getElementById('payday-saving').textContent,'—');assert.equal(p.d.getElementById('payday-month').disabled,true);p.dom.window.close();
});
test('payday month switching shows whole utility payments, one-time tax and bonus; edits preserve the selected month',()=>{
 const s=fixture();s.taxTotal=1200;s.oneOffs=[{amount:12000,month:'2099-06'}];const p=open({saved:{state:s,plan:{monthlyNet:0,onceNet:0},mode:'custom'}});
 assert.equal(p.d.getElementById('monthly-required').textContent,'HKD 24,000.00');assert.equal(p.d.getElementById('payday-reserves').textContent,'HKD 10,600.00');assert.equal(p.d.getElementById('payday-saving').textContent,'HKD 14,400.00');
 const picker=p.d.getElementById('payday-month');picker.value='2099-06';picker.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}));
 assert.equal(p.d.getElementById('payday-reserves').textContent,'HKD 8,300.00');assert.equal(p.d.getElementById('payday-income').textContent,'HKD 42,000.00');assert.equal(p.d.getElementById('payday-saving').textContent,'HKD 28,700.00');
 enter(p.dom,'spendingMonthly',6000);assert.equal(picker.value,'2099-06');assert.equal(p.d.getElementById('payday-saving').textContent,'HKD 27,700.00');
 enter(p.dom,'monthlyIncome',0);assert.equal(p.d.getElementById('payday-saving').textContent,'HKD 0.00');assert.equal(p.d.getElementById('payday-drawdown').hidden,false);assert.match(p.d.getElementById('payday-drawdown').textContent,/2,300.00/);p.dom.window.close();
});
test('the complete calculator keeps generic defaults and twelve months; all fields stay flat and editable',()=>{
 const {dom,d}=open();assert.equal(d.getElementById('target').value,'300,000');assert.equal(d.getElementById('startCash').value,'0');assert.equal(d.getElementById('horizon-value').textContent,'12個月');assert.equal(d.querySelectorAll('details,summary').length,0);assert.equal(d.querySelectorAll('#oneoffs .oneoff').length,0);assert.equal(d.querySelectorAll('.insurance-row').length,0);
 assert.equal(d.getElementById('ending').textContent,'194,400.00');assert.equal(d.querySelectorAll('.goal-dot').length,0);assert.equal(d.querySelectorAll('script[src],iframe,img[src^="http"]').length,0);dom.window.close();
});
test('edited local numbers persist across reload and drive the bar, line charts and fixed dock',()=>{
 const p=open();enter(p.dom,'monthlyIncome','35,000.25');enter(p.dom,'spendingMonthly','6,000');const cache=saved(p.dom),q=open({saved:cache});
 assert.equal(q.d.getElementById('monthlyIncome').value,'35,000.25');assert.equal(q.d.getElementById('spendingMonthly').value,'6,000');assert.equal(q.d.getElementById('ending').textContent,'242,403.00');assert.equal(q.d.getElementById('goal-projected').textContent,'HKD 242,403.00');assert.equal(q.d.getElementById('dock-monthly').textContent,'HKD 25,000.00');
 q.d.querySelector('[data-chart-mode="flow"]').click();assert.ok(q.d.querySelector('[data-series="bills"]'));p.dom.window.close();q.dom.window.close();
});
test('a shared plan fills the form without overwriting a friend existing local settings; keep and return are explicit',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},incoming=fixture();incoming.goal=500000;I.update(incoming,'salary',50000);
 const url=S.url(incoming,{onceNet:123.45},'https://example.test/'),p=open({saved:original,url});
 assert.equal(p.d.getElementById('target').value,'500,000');assert.equal(p.d.getElementById('monthlyIncome').value,'50,000');assert.deepEqual(saved(p.dom),original);assert.equal(p.d.getElementById('shared-plan-banner').hidden,false);
 enter(p.dom,'spendingMonthly','6,000');assert.deepEqual(saved(p.dom),original);p.d.getElementById('keep-shared-plan').click();assert.equal(saved(p.dom).state.spendingMonthly,6000);assert.equal(p.dom.window.location.hash,'#goal');assert.equal(p.d.getElementById('shared-plan-banner').hidden,true);
 const q=open({saved:original,url});q.d.getElementById('restore-local-plan').click();assert.equal(q.d.getElementById('target').value,'300,000');assert.equal(q.d.getElementById('monthlyIncome').value,'30,000');p.dom.window.close();q.dom.window.close();
});
test('invalid links leave local data intact, and sharing invalid forms cannot emit a misleading plan',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},p=open({saved:original,url:'https://example.test/#plan=bad'});
 assert.match(p.d.getElementById('share-import-note').textContent,/無效/);assert.equal(p.d.getElementById('target').value,'300,000');
 enter(p.dom,'taxTotal','');p.d.getElementById('share-plan').click();assert.equal(p.d.getElementById('share-panel').hidden,true);assert.match(p.d.getElementById('share-import-note').textContent,/填齊/);p.dom.window.close();
});
test('share action shows a fragment-only URL, clear disclosure and close action; readonly link is copyable',()=>{
 const p=open();enter(p.dom,'target','500,000');p.d.getElementById('share-plan').click();
 const link=new URL(p.d.getElementById('share-link').value);assert.equal(link.origin,'https://example.test');assert.equal(link.search,'');assert.equal(S.fromHash(link.hash).state.goal,500000);assert.equal(p.d.getElementById('share-link').readOnly,true);assert.match(p.d.getElementById('share-panel').textContent,/任何收到連結/);
 p.d.getElementById('close-share').click();assert.equal(p.d.getElementById('share-panel').hidden,true);p.dom.window.close();
});
test('hostile shared labels render as plain input text and do not create nodes',()=>{
 const s=fixture();s.incomeItems[0].name='<img src=x onerror=alert(1)>';const p=open({url:S.url(s,{},'https://example.test/')});assert.equal(p.d.querySelectorAll('#incomes img').length,0);assert.equal(p.d.getElementById('income-name-salary').value,s.incomeItems[0].name);p.dom.window.close();
});
test('unavailable storage leaves calculations usable and explains persistence failure',()=>{
 const p=open({storageFailure:true});assert.equal(p.d.getElementById('ending').textContent,'194,400.00');assert.match(p.d.getElementById('save-status').textContent,/未能儲存/);p.dom.window.close();
});
test('offline file is self contained and uses the verified public origin for share links',()=>{
 const offline=fs.readFileSync('dist/offline.html','utf8');assert.doesNotMatch(offline,/<link rel="manifest"|<script[^>]+src=/);const vc=new VirtualConsole();const dom=new JSDOM(offline,{url:'file:///offline.html',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;}});
 const d=dom.window.document;assert.match(d.getElementById('offline-status').textContent,/離線檔案使用中/);assert.equal(d.getElementById('download-offline').hidden,true);d.getElementById('share-plan').click();assert.equal(new URL(d.getElementById('share-link').value).origin,JSON.parse(fs.readFileSync('public-config.json')).publicUrl.replace(/\/$/,''));dom.window.close();
});
test('service worker caches only app assets and serves query-free shells without any input upload',async()=>{
 const handlers={},requests=[],removed=[],cache={addAll:async paths=>requests.push(...paths),match:async key=>({key})};
 const context={URL,Set,Promise,caches:{open:async()=>cache,keys:async()=>['saving-plan-old','another-app'],delete:async key=>removed.push(key)},self:{registration:{scope:'https://example.test/'},location:{origin:'https://example.test'},addEventListener:(name,handler)=>handlers[name]=handler,skipWaiting:async()=>{},clients:{claim:async()=>{}}},fetch:async()=>{throw new Error('Unexpected fetch');}};
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),context);let wait;handlers.install({waitUntil:p=>wait=p});await wait;assert.deepEqual(requests,['./','./offline.zip','./manifest.webmanifest','./icon.svg']);handlers.activate({waitUntil:p=>wait=p});await wait;assert.deepEqual(removed,['saving-plan-old']);
 let response;handlers.fetch({request:{url:'https://example.test/?arbitrary=ignored',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).key,'https://example.test/');response=null;handlers.fetch({request:{url:'https://other.test/',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal(response,null);
});

test('opening another shared fragment in an existing page imports it and restore returns the latest local edits',()=>{
 const p=open();enter(p.dom,'spendingMonthly',7000);const incoming=fixture();incoming.goal=700000;
 const hash=new URL(S.url(incoming,{},'https://example.test/')).hash;
 p.dom.window.history.replaceState(null,'',hash);p.dom.window.dispatchEvent(new p.dom.window.HashChangeEvent('hashchange'));
 assert.equal(p.d.getElementById('target').value,'700,000');assert.equal(saved(p.dom).state.spendingMonthly,7000);
 p.d.getElementById('restore-local-plan').click();assert.equal(p.d.getElementById('spendingMonthly').value,'7,000');assert.equal(p.d.getElementById('target').value,'300,000');p.dom.window.close();
});

test('shared import replaces a focused money field and restore never retains the draft value',()=>{
 const p=open(),field=p.d.getElementById('target');field.focus();field.value='300000';field.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}));
 const s=fixture();s.goal=500000;const hash=new URL(S.url(s,{},'https://example.test/')).hash;
 p.dom.window.history.replaceState(null,'',hash);p.dom.window.dispatchEvent(new p.dom.window.HashChangeEvent('hashchange'));
 assert.equal(p.d.getElementById('target').value,'500,000');
 const spending=p.d.getElementById('spendingMonthly');spending.focus();spending.value='7000';spending.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}));p.d.getElementById('restore-local-plan').click();
 assert.equal(p.d.getElementById('target').value,'300,000');assert.equal(p.d.getElementById('spendingMonthly').value,'5,000');assert.equal(p.d.getElementById('shared-plan-banner').hidden,true);p.dom.window.close();
});

const quickKey='savings-plan-quickstart-v1';
const next=p=>p.d.getElementById('quick-next').click();
function completeQuick(p,{goal=200000,months=12,cash=10000,income=30000,spending=5000,bills=8000,optional=false}={}){
 for(const [id,value] of [['quick-goal',goal],['quick-months',months],['quick-startCash',cash],['quick-income',income],['quick-spending',spending],['quick-bills',bills]]){if(id==='quick-bills')chooseBills(p,'total');enter(p.dom,id,value);next(p);}
 if(!optional)skipOptional(p);
}
function skipOptional(p){p.d.getElementById('quick-optional-skip').click();}
function chooseBills(p,mode){p.d.querySelector('[data-quick-bill-mode='+mode+']').click();}
function basicFive(p){for(const [id,value] of [['quick-goal',200000],['quick-months',12],['quick-startCash',10000],['quick-income',30000],['quick-spending',5000]]){enter(p.dom,id,value);next(p);}}
test('first arrival shows one question and never saves fictional calculator numbers as a personal plan',()=>{
 const p=open({guided:true,url:'https://example.test/#start'});assert.equal(p.dom.window.location.hash,'');assert.equal(p.d.body.dataset.view,'onboarding');assert.equal(p.d.getElementById('quick-title').textContent,'我要儲幾多？');assert.equal(p.d.querySelectorAll('[id^="quick-panel-"]:not([hidden])').length,1);assert.equal(saved(p.dom),null);
 enter(p.dom,'quick-goal',250000);next(p);assert.equal(p.d.getElementById('quick-count').textContent,'2 / 6');assert.equal(saved(p.dom),null);
 const draft=JSON.parse(p.dom.window.localStorage.getItem(quickKey)),q=open({guided:true,quickDraft:draft});assert.equal(q.d.body.dataset.view,'onboarding');assert.equal(q.d.getElementById('quick-count').textContent,'2 / 6');q.d.getElementById('quick-back').click();assert.equal(q.d.getElementById('quick-goal').value,'250,000');p.dom.window.close();q.dom.window.close();
});
test('six answers produce a conserved savings result without any hidden example bills or bonuses',()=>{
 const p=open({guided:true});completeQuick(p);const cache=saved(p.dom);
 assert.equal(p.d.body.dataset.view,'results');assert.equal(p.d.getElementById('quickstart').hidden,true);assert.equal(p.d.getElementById('ending').textContent,'214,000.00');assert.equal(cache.state.billItems.other,8000);assert.equal(cache.state.billItems.housing,0);assert.equal(cache.state.oneOffs.length,0);assert.equal(cache.state.taxTotal,0);assert.match(p.d.getElementById('simple-plan-note').textContent,/只計已填/);
 const q=open({saved:cache,quickDraft:JSON.parse(p.dom.window.localStorage.getItem(quickKey))});assert.equal(q.d.body.dataset.view,'results');assert.equal(q.d.getElementById('ending').textContent,'214,000.00');q.d.querySelector('.overview-links a[href="#inputs"]').click();assert.equal(q.d.body.dataset.view,'full');p.dom.window.close();q.dom.window.close();
});
test('missing and negative answers cannot advance; explicit zero is accepted and keyboard submit works',()=>{
 const p=open({guided:true});enter(p.dom,'quick-goal',-1);next(p);assert.equal(p.d.getElementById('quick-count').textContent,'1 / 6');assert.match(p.d.getElementById('quick-error').textContent,/0 或以上/);
 enter(p.dom,'quick-goal',300000);next(p);enter(p.dom,'quick-months',0);next(p);assert.equal(p.d.getElementById('quick-count').textContent,'2 / 6');enter(p.dom,'quick-months',12);next(p);p.d.getElementById('quick-zero').click();assert.equal(p.d.getElementById('quick-count').textContent,'4 / 6');next(p);assert.equal(p.d.getElementById('quick-count').textContent,'4 / 6');
 enter(p.dom,'quick-income',0);p.d.getElementById('quick-form').dispatchEvent(new p.dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(p.d.getElementById('quick-count').textContent,'5 / 6');p.dom.window.close();
});
test('skip opens the entire tool immediately, carries valid answers and leaves unanswered amounts visibly blank',()=>{
 const p=open({guided:true});enter(p.dom,'quick-goal',500000);p.d.getElementById('quick-skip').click();assert.equal(p.d.body.dataset.view,'full');assert.equal(p.d.getElementById('target').value,'500,000');assert.equal(p.d.getElementById('monthlyIncome').value,'');assert.equal(p.d.getElementById('spendingMonthly').value,'');assert.equal(p.d.getElementById('bill-other').value,'');assert.equal(p.d.getElementById('ending').textContent,'—');
 enter(p.dom,'monthlyIncome',30000);enter(p.dom,'spendingMonthly',5000);enter(p.dom,'bill-other',8000);assert.equal(p.d.getElementById('ending').textContent,'204,000.00');p.dom.window.close();
});
test('existing plans open directly and unchanged guided answers retain bonus, detailed bills, insurance and income names',()=>{
 const state=fixture();state.oneOffs=[{month:'2099-04',amount:5000}];const insurance=C.add(state);C.update(state,insurance.id,'name','虛構保單');C.update(state,insurance.id,'amount',1200);state.incomeItems[0].name='虛構人工';const original={state,plan:{monthlyNet:100,onceNet:200},mode:'custom'},p=open({saved:original});
 assert.equal(p.d.body.dataset.view,'full');const before=G.forecast(saved(p.dom).state,original.plan);p.d.getElementById('start-quick').click();for(let n=0;n<6;n++)next(p);skipOptional(p);const after=saved(p.dom);assert.deepEqual(G.forecast(after.state,after.plan),before);assert.deepEqual(after.state.utilityPayments,state.utilityPayments);assert.deepEqual(after.state.insuranceItems,state.insuranceItems);assert.deepEqual(after.state.incomeItems,state.incomeItems);assert.deepEqual(after.state.oneOffs,state.oneOffs);assert.equal(p.d.body.dataset.view,'results');p.dom.window.close();
});
test('changing a bills total deliberately replaces its old breakdown once, without charging it again',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},p=open({saved:original,url:'https://example.test/#start'});assert.equal(p.d.body.dataset.view,'onboarding');for(let n=0;n<5;n++)next(p);chooseBills(p,'total');assert.match(p.d.getElementById('quick-detail-note').textContent,/取代拆項/);enter(p.dom,'quick-bills',1000);next(p);skipOptional(p);const cache=saved(p.dom);assert.equal(cache.state.billsMonthly,1000);assert.equal(cache.state.billItems.other,1000);assert.equal(G.forecast(cache.state).totalBills,1200000);assert.equal(p.d.getElementById('ending').textContent,'288,000.00');p.dom.window.close();
});
test('shared links bypass onboarding; a guided shared preview never overwrites the receivers saved numbers',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},incoming=fixture();incoming.goal=600000;
 const p=open({saved:original,url:S.url(incoming,{},'https://example.test/')});assert.equal(p.d.body.dataset.view,'results');assert.equal(p.d.getElementById('quickstart').hidden,true);p.d.getElementById('start-quick').click();for(let n=0;n<6;n++)next(p);skipOptional(p);assert.deepEqual(saved(p.dom),original);assert.equal(p.d.getElementById('shared-plan-banner').hidden,false);p.d.getElementById('restore-local-plan').click();assert.equal(p.d.getElementById('target').value,'300,000');p.dom.window.close();
});
test('bad drafts fail closed and storage failure does not prevent finishing a local calculation',()=>{
 const p=open({guided:true,quickDraft:{version:1,view:'onboarding',step:99,values:{goal:'<script>'}}});assert.equal(p.d.getElementById('quick-count').textContent,'1 / 6');assert.equal(p.d.getElementById('quick-goal').value,'300,000');p.dom.window.close();
 const q=open({guided:true,storageFailure:true});completeQuick(q);assert.equal(q.d.getElementById('ending').textContent,'214,000.00');assert.match(q.d.getElementById('save-status').textContent,/未能儲存/);q.dom.window.close();
});

test('chart reaches the projected achievement month and its last interactive detail is beyond the unchanged deadline result',()=>{
 const p=open();const forecast=G.projectToGoal(saved(p.dom).state),last=forecast.rows.length-1;
 assert.equal(Number(p.d.getElementById('chart-month').max),last);assert.equal(p.d.querySelectorAll('.chart-hit').length,forecast.rows.length);assert.ok(p.d.querySelector('.chart-deadline'));assert.ok(p.d.querySelector('.chart-achieved'));assert.match(p.d.getElementById('chart-horizon-note').textContent,/期限後預測/);
 enter(p.dom,'chart-month',last);assert.match(p.d.getElementById('month-detail').textContent,/期限後預測/);assert.match(p.d.getElementById('month-detail').getAttribute('aria-label'),/2100/);assert.equal(p.d.getElementById('ending').textContent,'194,400.00');assert.equal(saved(p.dom).state.endMonth,'2099-12');assert.equal(p.d.querySelectorAll('#month-rows tr').length,12);
 p.d.querySelector('[data-chart-mode="flow"]').click();assert.equal(p.d.querySelectorAll('.chart-hit').length,forecast.rows.length);assert.ok(p.d.querySelector('[data-series="bills"]'));p.dom.window.close();
});
test('result shortcuts reveal the full editor and create editable extra income and bonus; bills and insurance remain accessible',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},p=open({saved:original,quickDraft:{version:1,view:'results'}});
 assert.equal(p.d.body.dataset.view,'results');p.d.getElementById('result-add-income').click();assert.equal(p.d.body.dataset.view,'full');assert.equal(p.d.querySelectorAll('#incomes .income-row').length,3);const name=p.d.activeElement;assert.equal(name.dataset.incomeName,'i1');enter(p.dom,'income-amount-i1',1000);assert.equal(p.d.getElementById('ending').textContent,'206,400.00');
 p.d.getElementById('result-add-bonus').click();assert.equal(p.d.querySelectorAll('#oneoffs .oneoff').length,1);assert.equal(p.d.activeElement.id,'oneoff-amount-0');enter(p.dom,'oneoff-amount-0',20000);assert.equal(p.d.getElementById('ending').textContent,'226,400.00');
 p.d.body.dataset.view='results';p.d.querySelector('.result-edit-actions a[href="#housing-section"]').click();assert.equal(p.d.body.dataset.view,'full');assert.ok(p.d.getElementById('bill-housing'));assert.ok(p.d.getElementById('payment-every-electricity'));p.d.getElementById('add-insurance').click();assert.equal(p.d.querySelectorAll('.insurance-row').length,1);p.dom.window.close();
});
test('unreachable chart does not invent a goal month and shared result shortcuts preserve the receivers saved plan',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0},mode:'custom'},incoming=fixture();I.update(incoming,'salary',0);const p=open({saved:original,url:S.url(incoming,{},'https://example.test/')});
 assert.equal(p.d.querySelectorAll('.chart-hit').length,120);assert.equal(p.d.querySelector('.chart-achieved'),null);assert.match(p.d.getElementById('chart-horizon-note').textContent,/仍未達標/);p.d.getElementById('result-add-income').click();enter(p.dom,'income-amount-i1',1000);assert.deepEqual(saved(p.dom),original);p.d.getElementById('restore-local-plan').click();assert.equal(p.d.getElementById('ending').textContent,'194,400.00');p.dom.window.close();
});

function select(p,id,value){const el=p.d.getElementById(id);el.value=String(value);el.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}));}
function addCost(p,kind,amount){select(p,'quick-cost-kind',kind);p.d.getElementById('quick-add-cost').click();const last=p.d.getElementById('quick-costs-rows').lastElementChild;const input=last.querySelector('[data-money-key][type=text]');enter(p.dom,input.id,amount);return last.dataset.rowId;}
test('optional income can add, edit and remove bonus and monthly extras without counting the base income twice',()=>{
 const p=open({guided:true});completeQuick(p,{optional:true});assert.equal(p.d.getElementById('quick-count').textContent,'選填 1 / 1');assert.equal(p.d.body.dataset.view,'onboarding');
 p.d.getElementById('quick-add-monthly').click();enter(p.dom,'qd-income-r1-name','虛構兼職');enter(p.dom,'qd-income-r1-amount',1000);
 p.d.getElementById('quick-add-once').click();enter(p.dom,'qd-income-r2-amount',20000);const month=p.d.getElementById('qd-income-r2-month').value;assert.match(month,/^\d{4}-\d{2}$/);assert.match(p.d.getElementById('quick-income-summary').textContent,/1,000.*20,000/);
 p.d.getElementById('quick-add-once').click();p.d.querySelector('[data-quick-remove=income][data-row-id=r3]').click();next(p);assert.equal(p.d.body.dataset.view,'results');
 const cache=saved(p.dom);assert.equal(G.incomeTotal(cache.state),3100000);assert.deepEqual(cache.state.oneOffs,[{amount:20000,month}]);assert.equal(p.d.getElementById('ending').textContent,'246,000.00');assert.equal(p.d.body.dataset.view,'results');p.dom.window.close();
});
test('detailed bills need no monthly total and preserve utility due dates plus annual reserves',()=>{
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0}},p=open({saved:original,url:'https://example.test/#start'});basicFive(p);chooseBills(p,'total');enter(p.dom,'quick-bills','');chooseBills(p,'detail');
 while(p.d.querySelector('[data-quick-remove=costs]'))p.d.querySelector('[data-quick-remove=costs]').click();
 addCost(p,'housing',7000);const electric=addCost(p,'electricity',600);select(p,'qd-costs-'+electric+'-every',2);enter(p.dom,'qd-costs-'+electric+'-nextMonth','2099-02');
 const policy=addCost(p,'insurance',1200);assert.equal(p.d.getElementById('qd-costs-'+policy+'-frequency').value,'annual');addCost(p,'rates',300);assert.match(p.d.getElementById('quick-costs-summary').textContent,/7,500/);assert.equal(p.d.getElementById('quick-bills-total').hidden,true);next(p);skipOptional(p);
 const cache=saved(p.dom),result=G.forecast(cache.state);assert.equal(cache.state.billItems.other,0);assert.equal(cache.state.billsMonthly,7500);assert.equal(result.rows[0].bills,720000);assert.equal(result.rows[1].bills,780000);assert.equal(result.totalBills,9000000);assert.equal(result.ending,22000000);assert.equal(p.d.getElementById('ending').textContent,'220,000.00');assert.deepEqual(G.validate(cache.state),[]);p.dom.window.close();
});
test('optional income drafts resume and skip discards additions while keeping the chosen monthly total',()=>{
 const p=open({guided:true});completeQuick(p,{optional:true});p.d.getElementById('quick-add-once').click();enter(p.dom,'qd-income-r1-amount',50000);enter(p.dom,'qd-income-r1-month','2099-04');
 const draft=JSON.parse(p.dom.window.localStorage.getItem(quickKey)),q=open({guided:true,quickDraft:draft});assert.equal(q.d.getElementById('quick-count').textContent,'選填 1 / 1');assert.equal(q.d.getElementById('qd-income-r1-amount').value,'50,000');assert.equal(q.d.getElementById('qd-income-r1-month').value,'2099-04');skipOptional(q);
 assert.equal(q.d.getElementById('ending').textContent,'214,000.00');assert.equal(saved(q.dom).state.oneOffs.length,0);assert.equal(saved(q.dom).state.billsMonthly,8000);p.dom.window.close();q.dom.window.close();
});
test('invalid optional income blocks continue, yet explicit skip finishes the valid base plan',()=>{
 const p=open({guided:true});completeQuick(p,{optional:true});p.d.getElementById('quick-add-once').click();enter(p.dom,'qd-income-r1-amount',-1);next(p);assert.equal(p.d.getElementById('quick-count').textContent,'選填 1 / 1');assert.match(p.d.getElementById('quick-error').textContent,/0 或以上/);enter(p.dom,'qd-income-r1-amount',1000);enter(p.dom,'qd-income-r1-month','');next(p);assert.match(p.d.getElementById('quick-error').textContent,/月份/);skipOptional(p);assert.equal(p.d.getElementById('ending').textContent,'214,000.00');p.dom.window.close();
});
test('an empty breakdown cannot silently become zero; explicit no-bills action is accepted',()=>{
 const p=open({guided:true});basicFive(p);chooseBills(p,'detail');next(p);assert.equal(p.d.getElementById('quick-count').textContent,'6 / 6');assert.match(p.d.getElementById('quick-error').textContent,/加一項/);assert.equal(p.d.activeElement.id,'quick-add-cost');p.d.getElementById('quick-zero').click();skipOptional(p);assert.equal(saved(p.dom).state.billsMonthly,0);assert.equal(p.d.getElementById('ending').textContent,'310,000.00');p.dom.window.close();
});
test('previous six-question drafts migrate without loss and optional shared edits stay a preview',()=>{
 const draft={version:1,view:'onboarding',step:5,values:{goal:200000,months:12,startCash:10000,income:30000,spending:5000,bills:8000}},p=open({guided:true,quickDraft:draft});assert.equal(p.d.getElementById('quick-count').textContent,'6 / 6');next(p);skipOptional(p);assert.equal(p.d.getElementById('ending').textContent,'214,000.00');p.dom.window.close();
 const original={state:fixture(),plan:{monthlyNet:0,onceNet:0}},incoming=fixture(),q=open({saved:original,url:S.url(incoming,{},'https://example.test/')});q.d.getElementById('start-quick').click();for(let n=0;n<6;n++)next(q);q.d.getElementById('quick-add-monthly').click();enter(q.dom,'qd-income-r1-amount',1000);next(q);assert.deepEqual(saved(q.dom),original);assert.equal(q.d.getElementById('ending').textContent,'206,400.00');q.d.getElementById('keep-shared-plan').click();assert.equal(G.incomeTotal(saved(q.dom).state),3100000);q.dom.window.close();
});

test('existing bonus edits replace the same dated receipt; added income and bill controls survive sharing exactly',()=>{
 const state=fixture();state.oneOffs=[{amount:5000,month:'2099-04'}];const p=open({saved:{state,plan:{monthlyNet:0,onceNet:0}},url:'https://example.test/#start'});for(let n=0;n<6;n++)next(p);assert.equal(p.d.getElementById('qd-income-r1-amount').value,'5,000');enter(p.dom,'qd-income-r1-amount',6000);p.d.getElementById('quick-add-monthly').click();enter(p.dom,'qd-income-r2-amount',1000);p.d.getElementById('quick-back').click();addCost(p,'insurance',2400);next(p);next(p);
 const cache=saved(p.dom);assert.deepEqual(cache.state.oneOffs,[{amount:6000,month:'2099-04'}]);const roundtrip=S.fromHash(new URL(S.url(cache.state,cache.plan,'https://example.test/')).hash);assert.deepEqual(G.forecast(roundtrip.state,roundtrip.plan),G.forecast(cache.state,cache.plan));p.dom.window.close();
});
test('breakdown drafts resume in the same bill mode without requiring a total',()=>{
 const p=open({guided:true});basicFive(p);chooseBills(p,'detail');const id=addCost(p,'water',400);select(p,'qd-costs-'+id+'-every',4);enter(p.dom,'qd-costs-'+id+'-nextMonth','2099-02');
 const draft=JSON.parse(p.dom.window.localStorage.getItem(quickKey)),q=open({guided:true,quickDraft:draft});assert.equal(q.d.getElementById('quick-count').textContent,'6 / 6');assert.equal(q.d.getElementById('quick-bills-total').hidden,true);assert.equal(q.d.getElementById('qd-costs-r1-nextMonth').value,'2099-02');assert.equal(q.d.getElementById('qd-costs-r1-every').value,'4');assert.equal(q.d.getElementById('qd-costs-r1-amount').value,'400');next(q);skipOptional(q);assert.equal(saved(q.dom).state.billsMonthly,100);p.dom.window.close();q.dom.window.close();
});
test('switching bill methods carries the sum and preserves entered rows, but never charges both',()=>{
 const p=open({guided:true});basicFive(p);chooseBills(p,'detail');addCost(p,'housing',7000);addCost(p,'management',500);chooseBills(p,'total');assert.equal(p.d.getElementById('quick-bills').value,'7,500');enter(p.dom,'quick-bills',8000);chooseBills(p,'detail');assert.equal(p.d.getElementById('qd-costs-r1-amount').value,'7,000');next(p);skipOptional(p);assert.equal(saved(p.dom).state.billsMonthly,7500);assert.equal(saved(p.dom).state.billItems.other,0);assert.equal(p.d.getElementById('ending').textContent,'220,000.00');p.dom.window.close();
});
test('choosing a monthly total for a saved detailed plan removes its dated charges even when the sum is unchanged',()=>{
 const state=fixture();state.utilityPayments.electricity.nextMonth='2099-02';const p=open({saved:{state,plan:{monthlyNet:0,onceNet:0}},url:'https://example.test/#start'});for(let n=0;n<5;n++)next(p);chooseBills(p,'total');assert.equal(p.d.getElementById('quick-bills').value,'8,800');next(p);skipOptional(p);const cache=saved(p.dom);assert.equal(cache.state.billItems.other,8800);assert.equal(cache.state.billItems.electricity,0);assert.ok(G.forecast(cache.state).rows.every(row=>row.bills===880000));p.dom.window.close();
});
test('previous optional-cost drafts migrate directly to the bill breakdown and preserve every answer',()=>{
 const values={goal:200000,months:12,startCash:10000,income:30000,spending:5000,bills:8000};
 const details={incomeUsed:true,costsUsed:true,income:[{id:'r1',kind:'once',amount:5000,month:'2099-04'}],costs:[{id:'r1',kind:'housing',amount:7000}]};
 const p=open({saved:{state:fixture(),plan:{monthlyNet:0,onceNet:0}},quickDraft:{version:2,view:'onboarding',step:7,values,details}});assert.equal(p.d.getElementById('quick-count').textContent,'6 / 6');assert.equal(p.d.getElementById('quick-bills-total').hidden,true);assert.equal(p.d.getElementById('qd-costs-r1-amount').value,'7,000');next(p);next(p);assert.equal(p.d.getElementById('ending').textContent,'231,000.00');p.dom.window.close();
});
test('invalid dated bills block the detailed method; switching to a valid total still finishes cleanly',()=>{
 const p=open({guided:true});basicFive(p);chooseBills(p,'detail');const water=addCost(p,'water',400);enter(p.dom,'qd-costs-'+water+'-nextMonth','');next(p);assert.match(p.d.getElementById('quick-error').textContent,/月份/);assert.equal(p.d.getElementById('quick-count').textContent,'6 / 6');chooseBills(p,'total');enter(p.dom,'quick-bills',8000);next(p);skipOptional(p);assert.equal(p.d.getElementById('ending').textContent,'214,000.00');p.dom.window.close();
});
