const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
function excludes(text,pattern,message='Forbidden content in checked file'){assert.equal(pattern.test(text),false,message);}
test('deployment contains only the static app allowlist, no source archives or runtime data',()=>{
 assert.deepEqual(fs.readdirSync('dist').sort(),['_headers','icon.svg','index.html','manifest.webmanifest','offline.html','offline.zip','sw.js']);
 const page=fs.readFileSync('dist/index.html','utf8');excludes(page,/source_document_id|profile_[a-f\d]|api[_-]?key|sendBeacon|XMLHttpRequest|WebSocket|https:\/\/.*analytics/i);
 excludes(page,/<script[^>]+src=/);excludes(page,/\.sqlite|data\/raw|source_storage_key|\/Users\//);
});
test('inline scripts are exactly allowlisted by CSP; no arbitrary external scripts, forms or network calls',()=>{
 const page=fs.readFileSync('dist/index.html','utf8'),policy=page.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(policy,/connect-src 'none'/);assert.match(policy,/form-action 'none'/);assert.match(policy,/worker-src 'self'/);excludes(policy,/script-src[^;]*(unsafe-inline|https:|'self')/);
 const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);assert.ok(scripts.length>10);for(const script of scripts)assert.ok(policy.includes("'sha256-"+crypto.createHash('sha256').update(script).digest('base64')+"'"));
 assert.match(page,/<meta name="referrer" content="no-referrer">/);
});

test('offline download is a deterministic ZIP containing exactly the self-contained HTML',()=>{
 const {execFileSync}=require('node:child_process');
 const result=JSON.parse(execFileSync('python3',['-c',"import zipfile,json; from pathlib import Path; z=zipfile.ZipFile('dist/offline.zip'); print(json.dumps({'files':z.namelist(),'matches':z.read('savings-goal-calculator.html')==Path('dist/offline.html').read_bytes()}))"],{encoding:'utf8'}));
 assert.deepEqual(result,{files:['savings-goal-calculator.html'],matches:true});
});

test('repository files exclude financial exports, machine paths, credentials and personal contact addresses',()=>{
 const {execFileSync}=require('node:child_process'),path=require('node:path');
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const forbidden=/\.(?:pdf|csv|xlsx?|sqlite(?:-\w+)?|db(?:-\w+)?|jsonl|har|pcap|pem|key)$/i;
 const secret=/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bAKIA[A-Z0-9]{16}|\bsk-(?:proj-)?[A-Za-z0-9_-]{30,})/;
 for(const file of files){
  assert.ok(!forbidden.test(file),'Unexpected data/credential export: '+file);
  assert.ok(!/^\.env(?:\.|$)/.test(path.basename(file))||path.basename(file)==='.env.example','Environment file: '+file);
  assert.ok(!/^(?:qa|data|statements|node_modules|\.wrangler|\.sites)\//.test(file),'Private/local directory: '+file);
  if(/\.zip$/i.test(file)){assert.equal(file,'dist/offline.zip','Unexpected archive: '+file);continue;}
  if(/\.(?:png|jpe?g)$/i.test(file)){assert.ok(file.startsWith('docs/images/'),'Unexpected image location: '+file);continue;}
  const text=fs.readFileSync(file,'utf8');
  excludes(text,/\/Users\/[A-Za-z0-9_@.-]+\//,'Machine-specific path: '+file);
  excludes(text,secret,'Credential-like value: '+file);
  const emails=text.match(/[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[];
  assert.ok(emails.every(email=>/@(?:users\.noreply\.github\.com|example\.(?:com|test))$/i.test(email)),'Contact address needs privacy review: '+file);
 }
});
