import { beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { settingConst } from '../../src/const/entity-const';
import { api, createAccount, uniqueEmail, updateSetting } from './helpers';

/**
 * Inbound and on-site delivery route `name+tag@domain` to the owner of
 * `name@domain` unless an account exists for the exact plus-address, and an
 * exact match always wins. `/account/add` therefore only lets the owner of the
 * base address create plus-addresses. Self-registration must not be a way
 * around that check, or anyone could claim another user's tagged mail.
 */
describe('registration of plus-addresses', () => {
	beforeAll(async () => {
		await updateSetting({
			register: settingConst.register.OPEN,
			reg_key: settingConst.regKey.CLOSE,
			register_verify: settingConst.registerVerify.CLOSE,
		});
	});

	let ipSequence = 0;
	// Registration is rate-limited per IP; give every request its own address.
	function register(email) {
		ipSequence += 1;
		return api('/api/register', {
			method: 'POST',
			body: { email, password: 'correct-horse-1' },
			headers: { 'CF-Connecting-IP': `203.0.113.${ipSequence}` },
		});
	}

	async function accountExists(email) {
		const row = await env.db
			.prepare('SELECT account_id FROM account WHERE email = ? COLLATE NOCASE LIMIT 1')
			.bind(email)
			.first();
		return Boolean(row);
	}

	it("refuses to register a plus-address of another user's mailbox", async () => {
		const victim = await createAccount(uniqueEmail('victim'));
		const [name, domain] = victim.email.split('@');
		const hijack = `${name}+shop@${domain}`;

		const body = await (await register(hijack)).json();

		expect(body.code).not.toBe(200);
		expect(await accountExists(hijack)).toBe(false);
	});

	it('refuses to pre-claim a plus-address whose base is not registered yet', async () => {
		const [name, domain] = uniqueEmail('future').split('@');
		const preclaim = `${name}+bank@${domain}`;

		const body = await (await register(preclaim)).json();

		expect(body.code).not.toBe(200);
		expect(await accountExists(preclaim)).toBe(false);
	});

	it('still registers an ordinary address', async () => {
		const email = uniqueEmail('plain');

		const body = await (await register(email)).json();

		expect(body.code).toBe(200);
		expect(await accountExists(email)).toBe(true);
	});
});
