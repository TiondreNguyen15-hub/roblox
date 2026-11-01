(function(root){
 const keywords=new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' '));
 function highlight(source,parent){
  parent.replaceChildren();let offset=0;
  const pattern=/--\[(=*)\[[\s\S]*?\]\1\]|--[^\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b[A-Za-z_]\w*\b/g;
  for(const match of source.matchAll(pattern)){
   parent.append(document.createTextNode(source.slice(offset,match.index)));const text=match[0],span=document.createElement('span');
   span.textContent=text;span.className=text.startsWith('--')?'lua-comment':text.startsWith('[')||text.startsWith('"')||text.startsWith("'")?'lua-string':/^\d/.test(text)?'lua-number':keywords.has(text)?'lua-keyword':'lua-word';parent.append(span);offset=match.index+text.length;
  }
  parent.append(document.createTextNode(source.slice(offset)+'\n'));
 }
 root.LuaHighlight={highlight};
})(globalThis);
