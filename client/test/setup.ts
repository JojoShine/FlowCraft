import 'fake-indexeddb/auto';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';
afterEach(()=>{cleanup();localStorage.clear();});
document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">';
if(!Blob.prototype.text) Blob.prototype.text=function(){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsText(this);});};
