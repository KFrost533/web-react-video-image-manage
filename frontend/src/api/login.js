import { apiGet, apiPost } from "./common/_fetch";

export async function loginToPrivate(UserName, Password) {
    return await apiPost(`/auth/login`, { username: UserName, password: Password });
}