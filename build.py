from pathlib import Path
import hashlib,json,base64,re,zipfile
root=Path(__file__).resolve().parent
page=(root/'calculator-page.html').read_text()
scripts={'STYLE':'calculator-style.css','MODEL':'calculator-model.js','CHART':'calculator-chart.js','CONTROLS':'calculator-controls.js','BILLS':'calculator-bills.js','INCOME':'calculator-income.js','COSTS':'calculator-costs.js','COST_CONTROLS':'calculator-cost-controls.js','PAYMENT_CONTROLS':'calculator-payment-controls.js','VISUALS':'calculator-visuals.js','SHARE':'calculator-share.js','QUICK_MODEL':'calculator-quick-model.js','QUICK_DETAILS':'calculator-quick-details.js','QUICKSTART':'calculator-quickstart.js','APP':'calculator-app.js','OFFLINE':'calculator-offline.js'}
for token,path in scripts.items():page=page.replace('/*__'+token+'__*/',(root/path).read_text())
config=json.loads((root/'public-config.json').read_text())
page=page.replace('/*__CONFIG__*/','const PlannerConfig='+json.dumps(config,ensure_ascii=False)+';')
assert '/*__' not in page
hashes=["'sha256-"+base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()+"'" for script in re.findall(r'<script>(.*?)</script>',page,re.S)]
page=page.replace("script-src 'self' 'unsafe-inline'",'script-src '+' '.join(hashes))
out=root/'dist';out.mkdir(exist_ok=True)
(out/'index.html').write_text(page)
offline=page.replace('<link rel="manifest" href="./manifest.webmanifest">','')
(out/'offline.html').write_text(offline)
with zipfile.ZipFile(out/'offline.zip','w',compression=zipfile.ZIP_DEFLATED) as bundle:
 entry=zipfile.ZipInfo('savings-goal-calculator.html',(1980,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED
 bundle.writestr(entry,offline.encode())
version=hashlib.sha256((page+(root/'sw.js').read_text()).encode()).hexdigest()[:12]
(out/'sw.js').write_text((root/'sw.js').read_text().replace('__CACHE_VERSION__',version))
(out/'icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#f7f4ee"/><path d="M42 132V96m36 36V72m36 60V50m36 82V28" stroke="#a95136" stroke-width="18" stroke-linecap="round"/></svg>')
(out/'manifest.webmanifest').write_text(json.dumps({'name':'存款目標計算器','short_name':'存款目標','start_url':'./','scope':'./','display':'standalone','background_color':'#f7f4ee','theme_color':'#f7f4ee','icons':[{'src':'./icon.svg','sizes':'any','type':'image/svg+xml','purpose':'any'}]},ensure_ascii=False))
(out/'_headers').write_text('/*\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/sw.js\n  Cache-Control: no-cache\n')
print('Built self-contained web and offline pages; cache version '+version)
