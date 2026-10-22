import {test as base,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import type {ContentFixture} from '../../../server/test/fixtures';
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const {require:tsxRequire}=require('tsx/cjs/api');
const jwt=require('jsonwebtoken') as typeof import('jsonwebtoken');
export const test=base.extend<{content:ContentFixture;token:string}>({
 content:async({},use)=>{const {withContentFixture}=tsxRequire('../../../server/test/fixtures.ts',import.meta.url);await withContentFixture(use);},
 token:async({content},use)=>{await use(jwt.sign({userId:content.owner.id},process.env.JWT_SECRET!));},
});
export {expect};
export const API='http://127.0.0.1:3801/api/v1';

export function signIn(userId:string) {return jwt.sign({userId},process.env.JWT_SECRET!);}
