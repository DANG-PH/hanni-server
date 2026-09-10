/** Payload user gắn vào request sau khi qua JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/** Claims trong access token của Hanni. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}
