import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {contentPreferencesApi} from './api';
import type {ContentKind,PreferenceDto} from './types';
export function useContentPreferences(kind:ContentKind,projectId?:string) {
 const {user}=useAuth();const [preferences,setPreferences]=useState<PreferenceDto[]>([]),scope=JSON.stringify([kind,projectId,user?.id]);
 const session=useRef({scope,writes:new Map<string,PreferenceDto>(),pending:new Set<string>()});
 if(session.current.scope!==scope) session.current={scope,writes:new Map(),pending:new Set()};
 useEffect(()=>{let active=true;const current=session.current;setPreferences([]);contentPreferencesApi.list(kind,projectId).then(rows=>{if(active&&session.current===current){const merged=new Map(rows.map(row=>[row.entityId,row]));for(const [id,row] of current.writes) merged.set(id,row);setPreferences([...merged.values()]);}}).catch(()=>{});return ()=>{active=false;};},[scope]);
 return {preferences,favorites:new Set(preferences.filter(p=>p.favorite).map(p=>p.entityId)),toggleFavorite:async(id:string)=>{
  const current=session.current;if(current.pending.has(id)) return;current.pending.add(id);
  try {const saved=await contentPreferencesApi.set(kind,id,{favorite:!preferences.find(p=>p.entityId===id)?.favorite});if(session.current===current){current.writes.set(id,saved);setPreferences(rows=>[...rows.filter(row=>row.entityId!==id),saved]);}return saved;}finally{current.pending.delete(id);}
 },markViewed:(id:string)=>contentPreferencesApi.set(kind,id,{lastViewedAt:new Date().toISOString()})};
}
