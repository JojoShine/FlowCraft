import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const authService = {
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      throw AppError.badRequest('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw AppError.badRequest('用户名或密码错误');
    }

    return user;
  },

  async register(username: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw AppError.conflict('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name: name || username,
      },
    });

    return user;
  },

  async exchangeCodeForUser(code: string) {
    const tokenRes = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: WECHAT_APP_ID,
        secret: WECHAT_APP_SECRET,
        code,
        grant_type: 'authorization_code',
      },
    });

    if (tokenRes.data.errcode) {
      throw new AppError(tokenRes.data.errmsg || '微信授权失败', 502);
    }

    const { access_token, openid, unionid } = tokenRes.data;

    const infoRes = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: { access_token, openid },
    });

    if (infoRes.data.errcode) {
      throw new AppError(infoRes.data.errmsg || '获取用户信息失败', 502);
    }

    const { nickname, headimgurl } = infoRes.data;

    return this.findOrCreateWechatUser(openid, unionid, nickname, headimgurl);
  },

  async findOrCreateWechatUser(openid: string, unionid: string | undefined, nickname: string, avatarUrl: string) {
    let user = await prisma.user.findUnique({ where: { wechatOpenId: openid } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: nickname,
          avatarUrl,
          wechatOpenId: openid,
          wechatUnionId: unionid || null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: nickname, avatarUrl },
      });
    }

    return user;
  },

  generateJwt(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  },
};
