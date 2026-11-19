import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = path.resolve('dist');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server = http.createServer((req,res)=>{
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file,'index.html') : file;
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(target)] || 'application/octet-stream');res.end(data);});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const child=spawn(process.execPath,['tools/verificar-fichas.mjs',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,SITE_BASE:`http://127.0.0.1:${server.address().port}`}});
const code=await new Promise(resolve=>{child.once('error',()=>resolve(2));child.once('exit',code=>resolve(code ?? 2));});
await new Promise(resolve=>server.close(resolve));
process.exitCode=code;
