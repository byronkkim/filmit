// ============================================================
// AES-256-GCM 암호화/복호화 유틸
// KYC 민감정보(주민번호 뒷자리, 사업자번호) 암호화에 사용
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_ENV = 'KYC_ENCRYPTION_KEY'; // 64자 hex (32바이트)

function getKey(): Buffer {
  const hex = process.env[KEY_ENV];
  if (!hex || hex.length !== 64) {
    throw new Error(
      `환경변수 ${KEY_ENV}가 설정되지 않았거나 길이가 올바르지 않습니다. (64자 hex 필요)`
    );
  }
  return Buffer.from(hex, 'hex');
}

export interface EncryptedData {
  encrypted: string; // hex
  iv: string;        // hex
}

/**
 * 평문을 AES-256-GCM으로 암호화
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getKey();
  const iv = randomBytes(12); // GCM 권장 96비트
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // authTag를 encrypted 뒤에 붙임
  const authTag = cipher.getAuthTag().toString('hex');
  encrypted += authTag;

  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * AES-256-GCM 복호화
 */
export function decrypt(encrypted: string, iv: string): string {
  const key = getKey();

  // 마지막 32자(16바이트)가 authTag
  const authTag = Buffer.from(encrypted.slice(-32), 'hex');
  const ciphertext = encrypted.slice(0, -32);

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * KYC_ENCRYPTION_KEY 생성 헬퍼 (개발용)
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
