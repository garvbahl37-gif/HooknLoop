/**
 * Floating widgets: the call button (bottom-left) and chat assistant (bottom-right).
 *
 * Both are inert without this file — the call button ships aria-hidden and
 * untabbable, the chat panel ships `hidden`. That is intentional: neither is
 * content, so neither should be announced to assistive tech until it is real.
 */
(function () {
	'use strict';

	/* ------------------------------------------------------- call button ---
	   Nothing to do. The button is visible from the first paint (it ships with
	   .is-visible on it), because hiding the one control for reaching a human
	   until the visitor has scrolled 220px removes it from exactly the screen
	   where someone who wants to phone rather than browse is standing.

	   The scroll gate that used to live here also left the anchor aria-hidden
	   and tabindex="-1" until it fired, so with JavaScript unavailable the
	   button was permanently unreachable by keyboard and screen reader. */

	/* --------------------------------------------------------------- chat ---*/
	var chat = document.querySelector('[data-mts-chat]');
	if (!chat) {
		return;
	}

	var launch = chat.querySelector('[data-mts-chat-launch]');
	var panel = chat.querySelector('[data-mts-chat-panel]');
	var closeBtn = chat.querySelector('[data-mts-chat-close]');
	var teaser = chat.querySelector('[data-mts-chat-teaser]');
	var teaserX = chat.querySelector('[data-mts-chat-teaser-close]');
	var ping = chat.querySelector('[data-mts-chat-ping]');
	var list = chat.querySelector('[data-mts-chat-list]');

	var SEEN = 'mts:chat:teaser-dismissed';
	var dismissed = false;
	try {
		dismissed = sessionStorage.getItem(SEEN) === '1';
	} catch (err) {
		dismissed = false;
	}

	function hideTeaser(remember) {
		if (!teaser) {
			return;
		}
		teaser.hidden = true;
		if (remember) {
			try {
				sessionStorage.setItem(SEEN, '1');
			} catch (err) { /* storage unavailable; the teaser simply returns next page */ }
		}
	}

	if (dismissed) {
		hideTeaser(false);
	} else if (teaser) {
		// Let the page settle before the teaser appears; showing it instantly
		// reads as an interruption rather than an offer.
		setTimeout(function () {
			if (!panel || panel.hidden) {
				teaser.classList.add('is-visible');
			}
		}, 4000);
	}

	function openChat() {
		if (!panel) {
			return;
		}
		panel.hidden = false;
		chat.classList.add('is-open');
		if (launch) {
			launch.setAttribute('aria-expanded', 'true');
		}
		if (ping) {
			ping.hidden = true;
		}
		hideTeaser(true);
		if (closeBtn) {
			closeBtn.focus();
		}
	}

	function closeChat() {
		if (!panel) {
			return;
		}
		panel.hidden = true;
		chat.classList.remove('is-open');
		if (launch) {
			launch.setAttribute('aria-expanded', 'false');
			launch.focus();
		}
	}

	if (launch) {
		launch.addEventListener('click', function () {
			if (panel && panel.hidden) {
				openChat();
			} else {
				closeChat();
			}
		});
	}
	if (closeBtn) {
		closeBtn.addEventListener('click', closeChat);
	}
	if (teaser) {
		teaser.addEventListener('click', function (e) {
			if (e.target.closest('[data-mts-chat-teaser-close]')) {
				return;
			}
			openChat();
		});
	}
	if (teaserX) {
		var dismiss = function (e) {
			e.stopPropagation();
			hideTeaser(true);
		};
		teaserX.addEventListener('click', dismiss);
		teaserX.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				dismiss(e);
			}
		});
	}

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && panel && !panel.hidden) {
			closeChat();
		}
	});

	/* Quick replies: append the question, then the scripted answer. */
	Array.prototype.forEach.call(chat.querySelectorAll('[data-mts-chat-q]'), function (btn) {
		btn.addEventListener('click', function () {
			if (!list) {
				return;
			}
			append('user', btn.textContent.trim());
			var answer = btn.getAttribute('data-answer') || '';
			var typing = append('bot', '', true);
			setTimeout(function () {
				if (typing) {
					typing.remove();
				}
				append('bot', answer);
			}, 550);
		});
	});

	function append(who, text, isTyping) {
		/* Once there is a conversation, the suggestion chips have done their job.
		   They exist to answer "what can I ask?" on an empty panel; left in place
		   they take a quarter of the panel's height for the rest of the session
		   and the replies get squeezed into what is left. CSS hides them off this
		   class — no animation, they are simply gone on the next message. */
		if (who === 'user') {
			chat.classList.add('is-chatting');
		}

		var row = document.createElement('div');
		row.className = 'chatw__row chatw__row--' + who;

		var msg = document.createElement('span');
		msg.className = isTyping ? 'chatw__msg chatw__typing' : 'chatw__msg';
		// textContent, never innerHTML: the scripted answers are ours, but the
		// echoed question comes from the DOM and this keeps the path closed.
		msg.textContent = isTyping ? '…' : text;

		row.appendChild(msg);
		list.appendChild(row);
		list.scrollTop = list.scrollHeight;
		return row;
	}

	/* ------------------------------------------------------ the assistant ---
	   The ask box is only in the DOM when a key is configured, so everything
	   below is inert on a store without one — the quick replies keep working
	   exactly as they always have. */

	var form = chat.querySelector('[data-mts-chat-form]');
	var input = chat.querySelector('[data-mts-chat-input]');

	if (!form || !input || typeof mtsChat === 'undefined' || !mtsChat.endpoint) {
		return;
	}

	/* Sent back with each question so follow-ups like "what about outdoors?"
	   resolve. Capped here as well as on the server — the server does not trust
	   this, it re-validates and strips any role it did not expect. */
	var history = [];
	var busy = false;

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		ask(input.value.trim());
	});

	function ask(question) {
		if (!question || busy) {
			return;
		}

		busy = true;
		input.value = '';
		append('user', question);
		var typing = append('bot', '', true);

		fetch(mtsChat.endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: question, history: history })
		})
			.then(function (r) { return r.ok ? r.json() : null; })
			.then(function (data) {
				if (typing) {
					typing.remove();
				}

				/* A null body means the request itself failed — offline, a 500,
				   a proxy in the way. The server's own fallbacks never land
				   here, they arrive as a normal reply. */
				if (!data || !data.reply) {
					append('bot', 'Sorry — that did not go through. You can reach our team from the link below.');
					return;
				}

				append('bot', data.reply);
				showProducts(data.products);

				history.push({ role: 'user', content: question });
				history.push({ role: 'assistant', content: data.reply });
				history = history.slice(-4);
			})
			.catch(function () {
				if (typing) {
					typing.remove();
				}
				append('bot', 'Sorry — that did not go through. You can reach our team from the link below.');
			})
			.then(function () {
				busy = false;
				input.focus();
			});
	}

	/* Product links are rendered HERE from structured data, never written by
	   the model. That is deliberate: a URL a model composed is a URL nobody
	   checked, and this way the only links a customer can click are ones the
	   catalogue actually returned. */
	function showProducts(products) {
		if (!products || !products.length) {
			return;
		}

		var wrap = document.createElement('div');
		wrap.className = 'chatw__links';

		products.slice(0, 3).forEach(function (p) {
			var a = document.createElement('a');
			a.className = 'chatw__link';
			a.href = p.url;
			a.textContent = p.price ? p.title + ' — ' + p.price : p.title;
			wrap.appendChild(a);
		});

		list.appendChild(wrap);
		list.scrollTop = list.scrollHeight;
	}
}());
