(function(){
var SUBJ=[
 {id:'mat',ico:'🧮',name:'Matematyka',pages:[
  ['liczby-i-dzialania.html','Liczby i działania'],
  ['liczby-wymierne.html','Liczby wymierne'],
  ['liczby_dodatnie_ujemne.html','Dodatnie i ujemne'],
  ['rok.html','Річна контрольна']]},
 {id:'fiz',ico:'🔬',name:'Fizyka',pages:[['fizyka.html','Pierwsze spotkanie']]},
 {id:'chem',ico:'🧪',name:'Chemia',pages:[['chemia.html','Dział 1+2'],['chemia-trudne.html','Trudne tematy']]},
 {id:'fr',ico:'🇫🇷',name:'Français',pages:[['francuski.html','Unité 1']]}
];
var file=(location.pathname.split('/').pop()||'index.html');
var cur=null;SUBJ.forEach(function(s){s.pages.forEach(function(p){if(p[0]===file)cur=s;});});
document.querySelectorAll('.ld-home').forEach(function(e){e.remove();});
var css='#ldnav{position:sticky;top:0;z-index:1000;background:#2d2657;color:#fff;font:600 13px/1.2 Sora,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.18)}'+
'#ldnav .r{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;scrollbar-width:none}#ldnav .r::-webkit-scrollbar{display:none}'+
'#ldnav .r2{background:#3a3170;padding-top:6px;padding-bottom:6px}'+
'#ldnav a{flex:none;color:#e6e1fb;text-decoration:none;padding:7px 11px;border-radius:16px;white-space:nowrap}'+
'#ldnav a.on{background:#fff;color:#2d2657}#ldnav .r2 a{font-weight:500;font-size:12.5px;padding:5px 10px}#ldnav .r2 a.on{background:#c8bfef;color:#2d2657;font-weight:700}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var h='<div class="r"><a href="index.html"'+(file==='index.html'||file===''?' class="on"':'')+'>🏠 Головна</a>';
SUBJ.forEach(function(s){h+='<a href="index.html#'+s.id+'"'+(cur===s?' class="on"':'')+'>'+s.ico+' '+s.name+'</a>';});
h+='</div>';
if(cur&&cur.pages.length>1){h+='<div class="r r2">';cur.pages.forEach(function(p){h+='<a href="'+p[0]+'"'+(p[0]===file?' class="on"':'')+'>'+p[1]+'</a>';});h+='</div>';}
var n=document.createElement('nav');n.id='ldnav';n.innerHTML=h;document.body.insertBefore(n,document.body.firstChild);
})();
