import {useSearchParams} from 'react-router-dom';
import {useProjectContext} from '../../contexts/ProjectContext';
import {useAuth} from '../../contexts/AuthContext';
export function useContentScope() {
 const {selectedProjectId}=useProjectContext(),{user}=useAuth();const [params,setParams]=useSearchParams();
 const projectId=user?.role==='viewer'?(user.projectId||null):params.get('scope')==='all'?null:params.get('projectId')||selectedProjectId;
 return {projectId,setScope:(id:string|null)=>{const next=new URLSearchParams(params);next.delete('projectId');next.delete('scope');if(id) next.set('projectId',id);else next.set('scope','all');setParams(next);}};
}
