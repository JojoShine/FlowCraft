import {useEffect,useState} from 'react';
export function useContentTheme() {
 const read=()=>(document.documentElement.dataset.theme==='dark'?'dark':'light') as 'dark'|'light';
 const [theme,setTheme]=useState(read);
 useEffect(()=>{const observer=new MutationObserver(()=>setTheme(read()));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return ()=>observer.disconnect();},[]);
 return theme;
}
