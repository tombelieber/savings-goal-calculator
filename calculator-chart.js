(function(root){
 'use strict';
 const box={width:360,height:230,left:48,right:342,top:22,bottom:198};
 const number=value=>Number(value.toFixed(2));
 const monthLabel=value=>value.slice(0,4)+'/'+Number(value.slice(5));
 function axisLabel(minor){
  const dollars=minor/100,absolute=Math.abs(dollars);
  if(absolute>=1e8)return number(dollars/1e8)+'億';
  if(absolute>=1e4)return number(dollars/1e4)+'萬';
  return new Intl.NumberFormat('en-HK',{maximumFractionDigits:2}).format(dollars);
 }
 function draw({result,base,goal,mode,currency,deadlineMonth,achievedMonth}){
  const rows=result.rows;
  const series=mode==='flow'?
   [{key:'in',label:'入儲蓄',values:rows.map(row=>row.savingsIn)},
    {key:'bills',label:'帳單及預留',values:rows.map(row=>row.bills)},
    {key:'tax',label:'稅金預留',values:rows.map(row=>row.tax)}]:
   [{key:'balance',label:'淨儲蓄',values:rows.map(row=>row.balance)}];
  if(mode==='balance'&&rows.some((row,i)=>row.balance!==base.rows[i].balance))
   series.unshift({key:'baseline',label:'未加額',values:base.rows.map(row=>row.balance)});
  if(mode==='balance')series.unshift({key:'target',label:'目標',values:rows.map(()=>goal)});
  const values=[0,...series.flatMap(line=>line.values)],low=Math.min(...values),high=Math.max(...values);
  const extent=high-low||100,minimum=low<0?low-extent*.06:0,maximum=high+extent*.12;
  const x=index=>rows.length===1?(box.left+box.right)/2:box.left+index*(box.right-box.left)/(rows.length-1);
  const y=value=>box.bottom-(value-minimum)/(maximum-minimum)*(box.bottom-box.top);
  const points=line=>line.key==='target'?`${box.left},${number(y(goal))} ${box.right},${number(y(goal))}`:
   line.values.map((value,i)=>`${number(x(i))},${number(y(value))}`).join(' ');
  const ticks=Array.from({length:4},(_,i)=>minimum+(maximum-minimum)*i/3);
  const labelIndices=rows.length<=3?rows.map((_,i)=>i):[0,Math.floor((rows.length-1)/2),rows.length-1];
  const start=rows[0].month,end=rows[rows.length-1].month;
  const deadlineIndex=rows.findIndex(row=>row.month===deadlineMonth),achievedIndex=rows.findIndex(row=>row.month===achievedMonth);
  const hasExtension=deadlineIndex>=0&&deadlineIndex<rows.length-1,deadlineX=hasExtension?number(x(deadlineIndex)):null;
  const svg=`<svg viewBox="0 0 ${box.width} ${box.height}" role="img" aria-labelledby="chart-title chart-description">
   <title id="chart-title">${mode==='flow'?'每月入儲蓄、帳單與稅金':'每月淨儲蓄與目標'} · ${currency}</title>
   <desc id="chart-description">${start} 至 ${end}，${rows.length}個月。點選圖中月份，或用下方月份滑桿查看確實金額。</desc>
   <text class="axis-unit" x="0" y="12">${currency}</text>
   ${hasExtension?`<rect class="chart-extension" x="${deadlineX}" y="${box.top}" width="${number(box.right-deadlineX)}" height="${box.bottom-box.top}"/><line class="chart-deadline" x1="${deadlineX}" x2="${deadlineX}" y1="${box.top}" y2="${box.bottom}"/><text class="chart-marker-label" x="${Math.max(box.left+26,Math.min(box.right-26,deadlineX))}" y="12" text-anchor="middle">原定期限</text>`:''}
   ${ticks.map(value=>`<g class="chart-grid"><line x1="${box.left}" x2="${box.right}" y1="${number(y(value))}" y2="${number(y(value))}"/><text x="${box.left-7}" y="${number(y(value)+3)}" text-anchor="end">${axisLabel(value)}</text></g>`).join('')}
   ${labelIndices.map(i=>`<text class="axis-month" x="${number(x(i))}" y="218" text-anchor="middle">${monthLabel(rows[i].month)}</text>`).join('')}
   ${series.map(line=>`<polyline class="chart-line series-${line.key}" data-series="${line.key}" data-values="${line.values.join(',')}" points="${points(line)}"/>`).join('')}
   <line class="chart-guide" x1="0" x2="0" y1="${box.top}" y2="${box.bottom}"/>
   ${series.filter(line=>line.key!=='target').map(line=>`<circle class="chart-dot series-${line.key}" data-dot="${line.key}" r="4"/>`).join('')}
   ${mode==='balance'&&achievedIndex>=0?`<circle class="chart-achieved" cx="${number(x(achievedIndex))}" cy="${number(y(rows[achievedIndex].balance))}" r="5"><title>${achievedMonth} 預計首次達標</title></circle>`:''}
   ${rows.map((row,i)=>{
    const left=i===0?box.left-12:(x(i-1)+x(i))/2,right=i===rows.length-1?box.right+12:(x(i)+x(i+1))/2;
    return `<rect class="chart-hit" data-chart-month="${i}" data-x="${number(x(i))}" x="${number(left)}" y="${box.top}" width="${number(right-left)}" height="${box.bottom-box.top}"><title>${row.month}</title></rect>`;
   }).join('')}
  </svg>`;
  const legend=series.map(line=>`<span><i class="legend-line series-${line.key}"></i>${line.label}</span>`).join('')+(hasExtension?'<span><i class="legend-extension"></i>期限後預測</span>':'')+(mode==='balance'&&achievedIndex>=0?'<span><i class="legend-achieved"></i>預計達標</span>':'');
  return {svg,legend};
 }
 function select(chart,index){
  const hit=chart.querySelector(`[data-chart-month="${index}"]`);if(!hit)return;
  const x=hit.dataset.x,guide=chart.querySelector('.chart-guide');guide.setAttribute('x1',x);guide.setAttribute('x2',x);
  for(const dot of chart.querySelectorAll('[data-dot]')){
   const line=chart.querySelector(`[data-series="${dot.dataset.dot}"]`),point=line.getAttribute('points').split(' ')[index].split(',');
   dot.setAttribute('cx',point[0]);dot.setAttribute('cy',point[1]);
  }
  chart.querySelectorAll('[data-chart-month]').forEach(node=>node.classList.toggle('selected',Number(node.dataset.chartMonth)===index));
 }
 root.SavingsChart={draw,select};
})(typeof window==='undefined'?globalThis:window);
