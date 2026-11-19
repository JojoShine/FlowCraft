import {Navigate,useParams} from 'react-router-dom';
export function DocumentSample(){const {id}=useParams();return <Navigate to={id?`/documents/${id}`:'/documents'} replace/>;}
