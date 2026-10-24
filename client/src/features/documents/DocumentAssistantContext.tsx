import {createContext,useContext,useState,useCallback,type ReactNode} from 'react';
import type {DocumentBody} from '../content/types';
import type {ExpansionSnapshot} from './documentExpansion';
export interface DocumentAssistantTarget {id:string;projectId:string;title:string;canEdit:boolean;instructions?:string;initialText?:string;autoGenerate?:boolean;onAutoGenerate?:()=>void;prepare:()=>Promise<ExpansionSnapshot>;apply:(snapshot:ExpansionSnapshot,body:DocumentBody)=>Promise<void>}
const Context=createContext<{target:DocumentAssistantTarget|null;setTarget:(target:DocumentAssistantTarget|null)=>void;open:()=>void;request:number}>({target:null,setTarget:()=>{},open:()=>{},request:0});
export function DocumentAssistantProvider({children,onOpen}:{children:ReactNode;onOpen:()=>void}){const [target,setTarget]=useState<DocumentAssistantTarget|null>(null),[request,setRequest]=useState(0);const open=useCallback(()=>{onOpen();setRequest(value=>value+1);},[onOpen]);return <Context.Provider value={{target,setTarget,open,request}}>{children}</Context.Provider>;}
export const useDocumentAssistant=()=>useContext(Context);
