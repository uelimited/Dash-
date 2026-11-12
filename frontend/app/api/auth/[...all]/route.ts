import {handleAuth} from '../../../../../backend/auth/handler.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=handleAuth;
export const POST=handleAuth;
