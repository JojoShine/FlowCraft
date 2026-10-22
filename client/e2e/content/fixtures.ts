import {test as base,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import type {ContentFixture} from '../../../server/test/fixtures';
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const jwt=require('jsonwebtoken') as typeof import('jsonwebtoken');
export const test=base.extend<{content:ContentFixture;token:string}>({
 content:async({},use)=>{const {withContentFixture}=await import('../../../server/test/fixtures');await withContentFixture(use);},
 token:async({content},use)=>{await use(jwt.sign({userId:content.owner.id},process.env.JWT_SECRET!));},
});
export {expect};
export const API='http://127.0.0.1:3801/api/v1';
