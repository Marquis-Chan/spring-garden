import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const file=fileURLToPath(new URL('../动物王国.html',import.meta.url));
const port=Number(process.env.POND_PREVIEW_PORT||7346);
// 只提供这个新作品的本地开发预览，不公开其他工作区文件。
http.createServer((req,res)=>{
 if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end();return;}
 const body=fs.readFileSync(file);
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Length':body.length});
 res.end(body);
}).listen(port,'127.0.0.1',()=>console.log('Pond preview: http://127.0.0.1:'+port+'/'));
