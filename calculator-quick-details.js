(function(root){
 'use strict';
 const G=root.SavingsCalculator,Q=root.QuickPlan,M=root.MoneyControls;
 const labels={housing:'租金／供樓',management:'管理費',electricity:'電費',water:'水費',gas:'煤氣',mobile:'手機月費',internet:'上網月費',rates:'差餉／地租',insurance:'保險',other:'其他固定帳單'};
 function create({read,base,currency,changed}){
  const $=id=>document.getElementById(id),ranges={};
  function moneyKey(type,id){return 'quick-detail-'+type+'-'+id;}
  function rowNode(type,row,index){
   const el=document.createElement('div');el.className='quick-detail-row';el.dataset.rowId=row.id;
   const head=document.createElement('div');head.className='quick-row-head';
   const title=document.createElement('strong');title.textContent=type==='income'?(row.kind==='monthly'?'每月額外收入':'Bonus／一次性收入')+' '+(index+1):labels[row.kind];head.append(title);
   const remove=document.createElement('button');remove.type='button';remove.dataset.quickRemove=type;remove.dataset.rowId=row.id;remove.textContent='移除';remove.setAttribute('aria-label','移除'+title.textContent);head.append(remove);el.append(head);
   function field(label,kind,key,options){
    const wrap=document.createElement('label');wrap.className='quick-row-field';const span=document.createElement('span');span.textContent=label;wrap.append(span);
    const input=document.createElement(kind==='select'?'select':'input');input.id='qd-'+type+'-'+row.id+'-'+key;input.dataset.quickDetail=type;input.dataset.rowId=row.id;input.dataset.field=key;
    if(kind==='select'){for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}}
    else {input.type=kind;if(kind==='text'){input.maxLength=60;input.placeholder=type==='income'?'例如：兼職':'例如：醫療保險';}else{input.min='1900-01';input.max='2200-12';}}
    wrap.append(input);el.append(wrap);
   }
   if(row.kind==='monthly'||row.kind==='insurance')field('名稱（可不填）','text','name');
   const mount=document.createElement('div');el.append(mount);
   const period=type==='income'?(row.kind==='monthly'?'每月金額':'到手金額'):G.utilityKeys.includes(row.kind)?'每期金額':row.kind==='rates'?'每季金額':row.kind==='insurance'?'保費金額':'每月金額';
   M.mount(mount,{key:moneyKey(type,row.id),id:'qd-'+type+'-'+row.id+'-amount',rangeId:'qd-'+type+'-'+row.id+'-slider',label:period+' · '+currency(),defaultMax:type==='income'?100000:30000});
   if(row.kind==='once')field('到手月份','month','month');
   if(row.kind==='insurance')field('付款方式','select','frequency',[['annual','每年'],['monthly','每月']]);
   if(G.utilityKeys.includes(row.kind)){
    field('隔幾個月交一次？','select','every',G.paymentPeriods.map(value=>[value,value===1?'每月':`每 ${value} 個月`]));field('下次付款月份','month','nextMonth');
    const note=document.createElement('p');note.className='help';note.textContent='按付款月份扣錢。下次付款預設首月，請按實際月份改。';el.append(note);
   }
   return el;
  }
  function renderList(type){
   const rows=read()[type],container=$('quick-'+type+'-rows'),ids=new Set(rows.map(row=>row.id));
   for(const el of [...container.children])if(!ids.has(el.dataset.rowId))el.remove();
   for(const [index,row] of rows.entries()){
    let el=[...container.children].find(node=>node.dataset.rowId===row.id);if(!el){el=rowNode(type,row,index);container.append(el);}
    M.render(moneyKey(type,row.id),row.amount,ranges,currency());
    for(const input of el.querySelectorAll('[data-quick-detail]'))if(document.activeElement!==input)input.value=row[input.dataset.field]??'';
   }
  }
  function render(){
   const extra=read();for(const type of ['income','costs'])renderList(type);
   $('quick-income-empty').hidden=extra.income.length>0;$('quick-costs-empty').hidden=extra.costs.length>0;
   const monthly=extra.income.filter(row=>row.kind==='monthly'),once=extra.income.filter(row=>row.kind==='once');
   const sum=rows=>rows.every(row=>G.amountOK(row.amount))?currency()+' '+M.format(rows.reduce((n,row)=>n+G.cents(row.amount),0)/100):'待填';
   $('quick-income-summary').textContent=`每月額外 ${sum(monthly)} · 一次性 ${sum(once)}`;
   $('quick-add-monthly').disabled=monthly.length+base().state.incomeItems.length>=12;$('quick-add-once').disabled=once.length>=12;
   const picker=$('quick-cost-kind'),available=Object.entries(labels).filter(([kind])=>kind==='insurance'?extra.costs.filter(row=>row.kind===kind).length<12:!extra.costs.some(row=>row.kind===kind));
   const previous=picker.value;picker.replaceChildren();for(const [kind,label] of available){const option=document.createElement('option');option.value=kind;option.textContent=label;picker.append(option);}if(available.some(([kind])=>kind===previous))picker.value=previous;
   $('quick-add-cost').disabled=!available.length;
   const state=base().state;
   let total='—';if(!Q.detailError(null,{},extra,'costs')){const projected=Q.apply({state,plan:{}},{}, {...extra,incomeUsed:false,costsUsed:true});total=currency()+' '+M.format(projected.state.billsMonthly);}
   $('quick-costs-summary').textContent=`帳單合計：每月約 ${total}`;
   $('quick-costs-note').textContent='水電煤按付款月份扣錢；差餉及年繳保費按月預留。';
  }
  function change(input){
   let type=input.dataset.quickDetail,id=input.dataset.rowId,field=input.dataset.field,value=input.value;
   if(input.dataset.moneyKey?.startsWith('quick-detail-')){const match=/^quick-detail-(income|costs)-(r\d+)$/.exec(input.dataset.moneyKey);if(!match)return false;[,type,id]=match;field='amount';value=M.read(input);}
   if(!type)return false;const extra=read(),row=extra[type].find(row=>row.id===id);if(!row)return true;
   row[field]=field==='every'?Number(value):value;
   if(field==='amount')row.estimated=false;if(field==='nextMonth')row.confirmed=true;
   extra[type+'Used']=true;changed();return true;
  }
  function add(type,kind){
   const extra=read(),rows=extra[type];let n=1;while(rows.some(row=>row.id==='r'+n))n++;
   const state=base().state,row={id:'r'+n,kind,amount:0};
   if(kind==='once')row.month=state.endMonth;
   if(kind==='insurance'){row.frequency='annual';row.name='';}
   if(kind==='monthly')row.name='';
   if(G.utilityKeys.includes(kind))Object.assign(row,{every:kind==='water'?4:2,nextMonth:state.startMonth,confirmed:false,estimated:true});
   rows.push(row);extra[type+'Used']=true;changed();$('qd-'+type+'-'+row.id+'-amount').focus();
  }
  function click(button){
   if(button.id==='quick-add-once'){if(!button.disabled)add('income','once');return true;}
   if(button.id==='quick-add-monthly'){if(!button.disabled)add('income','monthly');return true;}
   if(button.id==='quick-add-cost'){if(!button.disabled)add('costs',$('quick-cost-kind').value);return true;}
   if(button.dataset.quickRemove){const extra=read(),type=button.dataset.quickRemove;extra[type]=extra[type].filter(row=>row.id!==button.dataset.rowId);extra[type+'Used']=true;changed();$(type==='income'?'quick-add-once':'quick-add-cost').focus();return true;}
   if(button.dataset.expand?.startsWith('quick-detail-')){M.expand(button.dataset.expand,ranges);render();return true;}
   return false;
  }
  return {render,change,click};
 }
 root.QuickDetails={create};
})(typeof window==='undefined'?globalThis:window);
