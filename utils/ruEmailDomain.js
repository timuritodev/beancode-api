/**
 * ru-email-domain — проверка домена email на «российскость» (CommonJS-порт).
 *
 * Перенос ядра из beancode-trading (src/common/ru-email/ru-email-domain.ts).
 * Нулевая зависимость. Политика по умолчанию — белый список: адрес разрешён,
 * если домен в зоне .ru / .su / .рф ИЛИ явно добавлен в allowedDomains.
 * Это пропускает и публичные RU-сервисы (yandex.ru, mail.ru…), и корпоративную
 * почту на своём .ru-домене (info@roastery.ru) — важно для B2B.
 */

/** Российские доменные зоны верхнего уровня. `xn--p1ai` — punycode для «рф». */
const RU_TLDS = ['ru', 'su', 'рф', 'xn--p1ai'];

/** Известные российские провайдеры — справочно и как seed для allowedDomains. */
const RU_EMAIL_PROVIDERS = [
	'yandex.ru',
	'ya.ru',
	'narod.ru',
	'mail.ru',
	'bk.ru',
	'inbox.ru',
	'list.ru',
	'internet.ru',
	'rambler.ru',
	'lenta.ru',
	'autorambler.ru',
	'myrambler.ru',
	'ro.ru',
];

/** Текст ошибки по умолчанию (готов к показу пользователю). */
const RU_EMAIL_ERROR_MESSAGE =
	'Разрешена только почта в российских доменах (.ru, .su, .рф). ' +
	'Укажите адрес на yandex.ru, mail.ru или на корпоративном .ru-домене.';

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;

/** Возвращает домен email в нижнем регистре или null, если адрес некорректен. */
function extractEmailDomain(email) {
	if (typeof email !== 'string') return null;
	const match = EMAIL_RE.exec(email.trim().toLowerCase());
	return match ? match[1] : null;
}

function domainMatches(domain, entry) {
	const e = String(entry).trim().toLowerCase();
	return domain === e || domain.endsWith('.' + e);
}

function getTld(domain) {
	const idx = domain.lastIndexOf('.');
	return idx === -1 ? domain : domain.slice(idx + 1);
}

/**
 * Проверяет email по политике белого списка. Не бросает исключений — возвращает
 * результат с причиной отказа.
 * @returns {{ ok: true, domain: string } | { ok: false, reason: 'invalid_format'|'blocked_domain'|'foreign_domain', domain: string|null }}
 */
function checkRuEmailDomain(email, policy = {}) {
	const domain = extractEmailDomain(email);
	if (!domain) return { ok: false, reason: 'invalid_format', domain: null };

	const allowedTlds = policy.allowedTlds ?? RU_TLDS;
	const allowedDomains = policy.allowedDomains ?? [];
	const blockedDomains = policy.blockedDomains ?? [];

	if (blockedDomains.some((d) => domainMatches(domain, d))) {
		return { ok: false, reason: 'blocked_domain', domain };
	}

	const tld = getTld(domain);
	const tldAllowed = allowedTlds.some(
		(t) => String(t).trim().toLowerCase() === tld
	);
	const domainAllowed = allowedDomains.some((d) => domainMatches(domain, d));

	if (tldAllowed || domainAllowed) return { ok: true, domain };
	return { ok: false, reason: 'foreign_domain', domain };
}

/** Короткая булева обёртка над checkRuEmailDomain. */
function isRuEmailDomain(email, policy) {
	return checkRuEmailDomain(email, policy).ok;
}

module.exports = {
	RU_TLDS,
	RU_EMAIL_PROVIDERS,
	RU_EMAIL_ERROR_MESSAGE,
	extractEmailDomain,
	checkRuEmailDomain,
	isRuEmailDomain,
};
