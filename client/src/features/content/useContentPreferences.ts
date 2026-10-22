import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {contentPreferencesApi} from './api';
import type {ContentKind,PreferenceDto} from './types';
export function useContentPreferences(kind:ContentKind,projectId?:string) {
 const {user}=useAuth();const [preferences,setPreferences]=useState<PreferenceDto[]>([]);
 const reload=useCallback(async()=>{const rows=await contentPreferencesApi.list(kind,projectId);setPreferences(rows);},[kind,projectId,user?.id]);
 useEffect(()=>{let active=true;contentPreferencesApi.list(kind,projectId).then(rows=>{if(active) setPreferences(rows);}).catch(()=>{});return ()=>{active=false;};},[kind,projectId,user?.id]);
 return {preferences,favorites:new Set(preferences.filter(p=>p.favorite).map(p=>p.entityId)),toggleFavorite:async(id:string)=>{const current=preferences.find(p=>p.entityId===id);await contentPreferencesApi.set(kind,id,{favorite:!current?.favorite});await reload();},markViewed:(id:string)=>contentPreferencesApi.set(kind,id,{lastViewedAt:new Date().toISOString()}),reload};
}
