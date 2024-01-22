(function () {
  'use strict';

  var version = "0.1.1";

  function addModifiedScript(src) {
      // we want to manually fetch the script so we can modify it
      fetch(src)
          .then(response => response.text())
          .then(text => {
          const insertBeforeRegex = /.\.on\("reconnect_failed\"/g;
          const insertIndex = text.search(insertBeforeRegex);
          if (insertIndex == -1)
              return alert("Something went wrong! This likely means Quizlet made an update to their code. Please open an issue on GitHub.");
          const insertText = `window.qlc.setIo(${text[insertIndex]}),`;
          text = text.slice(0, insertIndex) + insertText + text.slice(insertIndex);
          // create a new blob with the modified text
          const blob = new Blob([text], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          // create a new script element with the modified url
          const script = document.createElement('script');
          script.src = url;
          // append the script element to the document
          document.head.appendChild(script);
      });
  }

  function setup$1(cheat) {
      const observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
              // Check if a new script element was added
              if (mutation.type !== 'childList')
                  return;
              const addedNodes = Array.from(mutation.addedNodes);
              for (let node of addedNodes) {
                  let src;
                  if (node.nodeName == "LINK") {
                      src = node.href;
                  }
                  else if (node.nodeName == "SCRIPT") {
                      src = node.src;
                  }
                  else
                      continue;
                  if (!src.includes("live_game_student") || !src.endsWith(".js"))
                      continue;
                  // get rid of the element so it doesn't get executed
                  node.remove();
                  if (cheat.alreadyIntercepted) { // we have to do it here, because for some reason quizlet loads the script twice
                      observer.disconnect();
                      return;
                  }
                  cheat.alreadyIntercepted = true;
                  addModifiedScript(src);
              }
          });
      });
      observer.observe(document.documentElement, {
          childList: true,
          subtree: true
      });
  }

  function setup(cheat) {
      function interceptScript(e) {
          // this is bad bad very bad
          if (!e.srcElement)
              return;
          let srcEl = e.srcElement;
          let src;
          if (srcEl.nodeName == "LINK") {
              src = srcEl.href;
          }
          else if (srcEl.nodeName == "SCRIPT") {
              src = srcEl.src;
          }
          else
              return;
          if (!src.includes("live_game_student") || !src.endsWith(".js"))
              return;
          console.log('cancelled', src);
          e.preventDefault();
          addModifiedScript(src);
          window.removeEventListener('beforescriptexecute', interceptScript);
      }
      // @ts-ignore beforescriptexecute is non-standard and only works on firefox. Fortunately, it's just firefox that need to run this script, so we're good.
      window.addEventListener('beforescriptexecute', interceptScript);
  }

  class Cheat {
      constructor() {
          this.alreadyIntercepted = false;
          this.hasPrompts = [];
          this.terms = [];
          this.currentPrompts = [];
          this.streakNumber = 0;
          this.roundNumber = 0;
          this.promptKind = "definition";
          this.setupSocketGetting();
          window.addEventListener('load', () => {
              this.addUpdateObserver();
          });
      }
      addHudInteract(hudInteract) {
          this.hudInteract = hudInteract;
          this.hudInteract.answerQuestion = this.answerQuestion.bind(this);
          this.hudInteract.onHelpModeChange = (mode) => {
              if (mode == 3) {
                  // outline correct
                  this.addCorrectBorder();
              }
              else {
                  this.removeCorrectBorder();
              }
          };
          this.hudInteract.onShowAnswerChange = (showAnswer) => {
              if (showAnswer) {
                  this.updateAnswerDisplay();
              }
              else {
                  this.removeAnswerDisplay();
              }
          };
      }
      updateAnswerDisplay() {
          let correctId = this.currentPrompts[this.roundNumber];
          let cardInfo = this.terms.find(term => term.id == correctId);
          if (!cardInfo)
              return;
          // get the element to put the answer into
          let promptDiv = document.querySelector(".StudentPrompt");
          if (!promptDiv)
              return;
          promptDiv.style.flexDirection = "column";
          // TODO: this sucks
          let answerEl = promptDiv.querySelector(".qlc-answer");
          if (!answerEl) {
              answerEl = document.createElement("div");
              answerEl.classList.add("qlc-answer");
          }
          // clear the element
          answerEl.innerHTML = "";
          answerEl.style.display = "flex";
          answerEl.style.alignItems = "center";
          answerEl.style.border = "2px solid #18ab1d";
          answerEl.style.borderRadius = "0.5rem";
          if (this.promptKind == "definition") {
              // set the text to the word
              answerEl.innerHTML = `<div>${cardInfo.word}</div>`;
          }
          else {
              // set the text, image or both
              if (cardInfo.definition != '') {
                  answerEl.innerHTML = `<div>${cardInfo.definition}</div>`;
              }
              if (cardInfo._imageUrl != null) {
                  let img = document.createElement("img");
                  img.style.marginLeft = "0.5rem";
                  img.style.borderRadius = "0.5rem";
                  img.src = cardInfo._imageUrl;
                  answerEl.appendChild(img);
              }
          }
          // add the element to the page
          promptDiv.appendChild(answerEl);
      }
      removeAnswerDisplay() {
          let answerEl = document.querySelector(".qlc-answer");
          if (!answerEl)
              return;
          answerEl.remove();
      }
      removeCorrectBorder() {
          let cards = document.querySelectorAll(".StudentAnswerOptions-optionCard");
          if (!cards)
              return;
          for (let card of cards) {
              card.style.borderRadius = "0.5rem";
              card.style.border = "none";
          }
      }
      addCorrectBorder() {
          var _a, _b;
          let cards = document.querySelectorAll(".StudentAnswerOptions-optionCard");
          if (!cards)
              return;
          let correctId = this.currentPrompts[this.roundNumber];
          if (!this.hasPrompts.includes(correctId))
              return;
          let cardInfo = this.terms.find(term => term.id == correctId);
          if (!cardInfo)
              return;
          // match the word to the card
          for (let card of cards) {
              let text = (_a = card.querySelector('.StudentAnswerOption-text > div')) === null || _a === void 0 ? void 0 : _a.textContent;
              let bgImg = (_b = card.querySelector('.StudentAnswerOption-image .Image-image')) === null || _b === void 0 ? void 0 : _b.style.backgroundImage;
              let bgImgUrl = bgImg === null || bgImg === void 0 ? void 0 : bgImg.slice(5, bgImg.length - 2);
              let matches = true;
              // determine whether the card is correct
              if (this.promptKind == "definition") {
                  if (text != cardInfo.word)
                      matches = false;
              }
              else {
                  if (text != cardInfo.definition && cardInfo.definition != '')
                      matches = false;
                  if (bgImgUrl != cardInfo._imageUrl && cardInfo._imageUrl != null)
                      matches = false;
              }
              card.style.borderRadius = "0.5rem";
              if (matches) {
                  card.style.border = "2px solid #18ab1d";
              }
              else {
                  card.style.border = "2px solid #c72d0e";
              }
          }
      }
      log(...args) {
          console.log("[QLC]", ...args);
      }
      setIo(io) {
          // io is the socket.io instance that the game uses to communicate with the server
          this.io = io;
          this.log("io set", io);
          // this.attachDebugListeners();
          io.on("current-game-state-and-set", this.handleGameState.bind(this));
          io.on("current-game-state", this.handleGameState.bind(this));
          io.on("matchteam.new-answer", (data) => {
              this.streakNumber = data.streakNum;
              this.roundNumber = data.roundNum + 1;
              // if the answer is incorrect, reset the streak and round number
              if (!data.answer.isCorrect) {
                  this.streakNumber++;
                  this.roundNumber = 0;
              }
              // update the prompts
              let newPrompts = data.terms[this.getPlayerId()];
              if (newPrompts)
                  this.hasPrompts = newPrompts;
              if (this.hudInteract.helpMode == 1) { // auto answer
                  this.answerQuestion();
              }
              else if (this.hudInteract.helpMode == 2) { // auto answer (wait)
                  setTimeout(() => {
                      this.answerQuestion();
                  }, 1900);
              }
          });
          io.on("matchteam.new-streak", (data) => {
              this.setPrompts(data.streak);
          });
      }
      attachDebugListeners() {
          var _a;
          const listenTo = ["reconnect_failed", "connect_error", "current-game-state-and-set", "current-game-state", "current-team-state", "current-leaderboard-state", "replay-game", "delete-game", "reconnect_failed", "error", "reconnecting", "connect", "disconnect", "game-error", "matchteam.new-answer", "matchteam.new-streak", "matchteam.submit-answer", "late-join-backfill", "next-question", "game-status", "player-added", "player-info-reload", "grade-answers", "user-answers", "studiable-item-ids", "written-studiable-item-ids", "game-errors", "game-restarted", "player-removed", "late-join", "qping", "player-info", "next-question", "answer-info"];
          for (let event of listenTo) {
              (_a = this.io) === null || _a === void 0 ? void 0 : _a.on(event, (...args) => {
                  this.log("event", event, args);
              });
          }
      }
      setPrompts(streak) {
          this.currentPrompts = streak.prompts;
          let newPrompts = streak.terms[this.getPlayerId()];
          if (newPrompts)
              this.hasPrompts = newPrompts;
      }
      handleGameState(data) {
          this.terms = data.terms;
          this.promptKind = data.options.promptWith == 1 ? 'term' : 'definition';
          let playerId = this.getPlayerId();
          let playerTeam = data.teams.find(team => team.players.includes(playerId));
          if (!playerTeam)
              return;
          let streak = playerTeam.streaks[playerTeam.streaks.length - 1];
          if (!streak)
              return;
          this.setPrompts(streak);
          // get the current streak and round number
          this.streakNumber = playerTeam.streaks.length - 1;
          this.roundNumber = streak.answers.length;
      }
      answerQuestion() {
          var _a;
          let correctId = this.currentPrompts[this.roundNumber];
          if (!this.hasPrompts.includes(correctId))
              return;
          (_a = this.io) === null || _a === void 0 ? void 0 : _a.emit("matchteam.submit-answer", {
              streak: this.streakNumber,
              round: this.roundNumber,
              termId: correctId
          });
      }
      getPlayerId() {
          var _a, _b;
          let playerId = (_b = (_a = window.Quizlet) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
          if (playerId)
              return String(playerId);
          return window.Quizlet.uid;
      }
      addUpdateObserver() {
          let cheat = this;
          const observer = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                  if (mutation.type !== "childList")
                      return;
                  // prevent infinite loop
                  if (mutation.target.matches(".StudentPrompt, .StudentPrompt *"))
                      return;
                  if (cheat.hudInteract.helpMode == 3) { // outline correct
                      cheat.addCorrectBorder();
                  }
                  if (cheat.hudInteract.showAnswer) ;
              });
          });
          observer.observe(document.body, {
              childList: true,
              subtree: true
          });
      }
      setupSocketGetting() {
          if (navigator.userAgent.includes("Firefox")) {
              setup();
          }
          else {
              setup$1(this);
          }
      }
  }

  /** @returns {void} */
  function noop() {}

  function run(fn) {
  	return fn();
  }

  function blank_object() {
  	return Object.create(null);
  }

  /**
   * @param {Function[]} fns
   * @returns {void}
   */
  function run_all(fns) {
  	fns.forEach(run);
  }

  /**
   * @param {any} thing
   * @returns {thing is Function}
   */
  function is_function(thing) {
  	return typeof thing === 'function';
  }

  /** @returns {boolean} */
  function safe_not_equal(a, b) {
  	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
  }

  /** @returns {boolean} */
  function is_empty(obj) {
  	return Object.keys(obj).length === 0;
  }

  /** @type {typeof globalThis} */
  const globals =
  	typeof window !== 'undefined'
  		? window
  		: typeof globalThis !== 'undefined'
  		? globalThis
  		: // @ts-ignore Node typings have this
  		  global;

  /**
   * @param {Node} target
   * @param {Node} node
   * @returns {void}
   */
  function append(target, node) {
  	target.appendChild(node);
  }

  /**
   * @param {Node} target
   * @param {string} style_sheet_id
   * @param {string} styles
   * @returns {void}
   */
  function append_styles(target, style_sheet_id, styles) {
  	const append_styles_to = get_root_for_style(target);
  	if (!append_styles_to.getElementById(style_sheet_id)) {
  		const style = element('style');
  		style.id = style_sheet_id;
  		style.textContent = styles;
  		append_stylesheet(append_styles_to, style);
  	}
  }

  /**
   * @param {Node} node
   * @returns {ShadowRoot | Document}
   */
  function get_root_for_style(node) {
  	if (!node) return document;
  	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
  	if (root && /** @type {ShadowRoot} */ (root).host) {
  		return /** @type {ShadowRoot} */ (root);
  	}
  	return node.ownerDocument;
  }

  /**
   * @param {ShadowRoot | Document} node
   * @param {HTMLStyleElement} style
   * @returns {CSSStyleSheet}
   */
  function append_stylesheet(node, style) {
  	append(/** @type {Document} */ (node).head || node, style);
  	return style.sheet;
  }

  /**
   * @param {Node} target
   * @param {Node} node
   * @param {Node} [anchor]
   * @returns {void}
   */
  function insert(target, node, anchor) {
  	target.insertBefore(node, anchor || null);
  }

  /**
   * @param {Node} node
   * @returns {void}
   */
  function detach(node) {
  	if (node.parentNode) {
  		node.parentNode.removeChild(node);
  	}
  }

  /**
   * @template {keyof HTMLElementTagNameMap} K
   * @param {K} name
   * @returns {HTMLElementTagNameMap[K]}
   */
  function element(name) {
  	return document.createElement(name);
  }

  /**
   * @param {string} data
   * @returns {Text}
   */
  function text(data) {
  	return document.createTextNode(data);
  }

  /**
   * @returns {Text} */
  function space() {
  	return text(' ');
  }

  /**
   * @returns {Text} */
  function empty() {
  	return text('');
  }

  /**
   * @param {EventTarget} node
   * @param {string} event
   * @param {EventListenerOrEventListenerObject} handler
   * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
   * @returns {() => void}
   */
  function listen(node, event, handler, options) {
  	node.addEventListener(event, handler, options);
  	return () => node.removeEventListener(event, handler, options);
  }

  /**
   * @param {Element} node
   * @param {string} attribute
   * @param {string} [value]
   * @returns {void}
   */
  function attr(node, attribute, value) {
  	if (value == null) node.removeAttribute(attribute);
  	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }

  /**
   * @param {Element} element
   * @returns {ChildNode[]}
   */
  function children(element) {
  	return Array.from(element.childNodes);
  }

  /**
   * @param {Text} text
   * @param {unknown} data
   * @returns {void}
   */
  function set_data(text, data) {
  	data = '' + data;
  	if (text.data === data) return;
  	text.data = /** @type {string} */ (data);
  }

  /**
   * @typedef {Node & {
   * 	claim_order?: number;
   * 	hydrate_init?: true;
   * 	actual_end_child?: NodeEx;
   * 	childNodes: NodeListOf<NodeEx>;
   * }} NodeEx
   */

  /** @typedef {ChildNode & NodeEx} ChildNodeEx */

  /** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

  /**
   * @typedef {ChildNodeEx[] & {
   * 	claim_info?: {
   * 		last_index: number;
   * 		total_claimed: number;
   * 	};
   * }} ChildNodeArray
   */

  let current_component;

  /** @returns {void} */
  function set_current_component(component) {
  	current_component = component;
  }

  const dirty_components = [];
  const binding_callbacks = [];

  let render_callbacks = [];

  const flush_callbacks = [];

  const resolved_promise = /* @__PURE__ */ Promise.resolve();

  let update_scheduled = false;

  /** @returns {void} */
  function schedule_update() {
  	if (!update_scheduled) {
  		update_scheduled = true;
  		resolved_promise.then(flush);
  	}
  }

  /** @returns {void} */
  function add_render_callback(fn) {
  	render_callbacks.push(fn);
  }

  // flush() calls callbacks in this order:
  // 1. All beforeUpdate callbacks, in order: parents before children
  // 2. All bind:this callbacks, in reverse order: children before parents.
  // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
  //    for afterUpdates called during the initial onMount, which are called in
  //    reverse order: children before parents.
  // Since callbacks might update component values, which could trigger another
  // call to flush(), the following steps guard against this:
  // 1. During beforeUpdate, any updated components will be added to the
  //    dirty_components array and will cause a reentrant call to flush(). Because
  //    the flush index is kept outside the function, the reentrant call will pick
  //    up where the earlier call left off and go through all dirty components. The
  //    current_component value is saved and restored so that the reentrant call will
  //    not interfere with the "parent" flush() call.
  // 2. bind:this callbacks cannot trigger new flush() calls.
  // 3. During afterUpdate, any updated components will NOT have their afterUpdate
  //    callback called a second time; the seen_callbacks set, outside the flush()
  //    function, guarantees this behavior.
  const seen_callbacks = new Set();

  let flushidx = 0; // Do *not* move this inside the flush() function

  /** @returns {void} */
  function flush() {
  	// Do not reenter flush while dirty components are updated, as this can
  	// result in an infinite loop. Instead, let the inner flush handle it.
  	// Reentrancy is ok afterwards for bindings etc.
  	if (flushidx !== 0) {
  		return;
  	}
  	const saved_component = current_component;
  	do {
  		// first, call beforeUpdate functions
  		// and update components
  		try {
  			while (flushidx < dirty_components.length) {
  				const component = dirty_components[flushidx];
  				flushidx++;
  				set_current_component(component);
  				update(component.$$);
  			}
  		} catch (e) {
  			// reset dirty state to not end up in a deadlocked state and then rethrow
  			dirty_components.length = 0;
  			flushidx = 0;
  			throw e;
  		}
  		set_current_component(null);
  		dirty_components.length = 0;
  		flushidx = 0;
  		while (binding_callbacks.length) binding_callbacks.pop()();
  		// then, once components are updated, call
  		// afterUpdate functions. This may cause
  		// subsequent updates...
  		for (let i = 0; i < render_callbacks.length; i += 1) {
  			const callback = render_callbacks[i];
  			if (!seen_callbacks.has(callback)) {
  				// ...so guard against infinite loops
  				seen_callbacks.add(callback);
  				callback();
  			}
  		}
  		render_callbacks.length = 0;
  	} while (dirty_components.length);
  	while (flush_callbacks.length) {
  		flush_callbacks.pop()();
  	}
  	update_scheduled = false;
  	seen_callbacks.clear();
  	set_current_component(saved_component);
  }

  /** @returns {void} */
  function update($$) {
  	if ($$.fragment !== null) {
  		$$.update();
  		run_all($$.before_update);
  		const dirty = $$.dirty;
  		$$.dirty = [-1];
  		$$.fragment && $$.fragment.p($$.ctx, dirty);
  		$$.after_update.forEach(add_render_callback);
  	}
  }

  /**
   * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
   * @param {Function[]} fns
   * @returns {void}
   */
  function flush_render_callbacks(fns) {
  	const filtered = [];
  	const targets = [];
  	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
  	targets.forEach((c) => c());
  	render_callbacks = filtered;
  }

  const outroing = new Set();

  /**
   * @param {import('./private.js').Fragment} block
   * @param {0 | 1} [local]
   * @returns {void}
   */
  function transition_in(block, local) {
  	if (block && block.i) {
  		outroing.delete(block);
  		block.i(local);
  	}
  }

  /** @typedef {1} INTRO */
  /** @typedef {0} OUTRO */
  /** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
  /** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

  /**
   * @typedef {Object} Outro
   * @property {number} r
   * @property {Function[]} c
   * @property {Object} p
   */

  /**
   * @typedef {Object} PendingProgram
   * @property {number} start
   * @property {INTRO|OUTRO} b
   * @property {Outro} [group]
   */

  /**
   * @typedef {Object} Program
   * @property {number} a
   * @property {INTRO|OUTRO} b
   * @property {1|-1} d
   * @property {number} duration
   * @property {number} start
   * @property {number} end
   * @property {Outro} [group]
   */

  /** @returns {void} */
  function mount_component(component, target, anchor) {
  	const { fragment, after_update } = component.$$;
  	fragment && fragment.m(target, anchor);
  	// onMount happens before the initial afterUpdate
  	add_render_callback(() => {
  		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
  		// if the component was destroyed immediately
  		// it will update the `$$.on_destroy` reference to `null`.
  		// the destructured on_destroy may still reference to the old array
  		if (component.$$.on_destroy) {
  			component.$$.on_destroy.push(...new_on_destroy);
  		} else {
  			// Edge case - component was destroyed immediately,
  			// most likely as a result of a binding initialising
  			run_all(new_on_destroy);
  		}
  		component.$$.on_mount = [];
  	});
  	after_update.forEach(add_render_callback);
  }

  /** @returns {void} */
  function destroy_component(component, detaching) {
  	const $$ = component.$$;
  	if ($$.fragment !== null) {
  		flush_render_callbacks($$.after_update);
  		run_all($$.on_destroy);
  		$$.fragment && $$.fragment.d(detaching);
  		// TODO null out other refs, including component.$$ (but need to
  		// preserve final state?)
  		$$.on_destroy = $$.fragment = null;
  		$$.ctx = [];
  	}
  }

  /** @returns {void} */
  function make_dirty(component, i) {
  	if (component.$$.dirty[0] === -1) {
  		dirty_components.push(component);
  		schedule_update();
  		component.$$.dirty.fill(0);
  	}
  	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
  }

  /** @returns {void} */
  function init(
  	component,
  	options,
  	instance,
  	create_fragment,
  	not_equal,
  	props,
  	append_styles,
  	dirty = [-1]
  ) {
  	const parent_component = current_component;
  	set_current_component(component);
  	/** @type {import('./private.js').T$$} */
  	const $$ = (component.$$ = {
  		fragment: null,
  		ctx: [],
  		// state
  		props,
  		update: noop,
  		not_equal,
  		bound: blank_object(),
  		// lifecycle
  		on_mount: [],
  		on_destroy: [],
  		on_disconnect: [],
  		before_update: [],
  		after_update: [],
  		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
  		// everything else
  		callbacks: blank_object(),
  		dirty,
  		skip_bound: false,
  		root: options.target || parent_component.$$.root
  	});
  	append_styles && append_styles($$.root);
  	let ready = false;
  	$$.ctx = instance
  		? instance(component, options.props || {}, (i, ret, ...rest) => {
  				const value = rest.length ? rest[0] : ret;
  				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
  					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
  					if (ready) make_dirty(component, i);
  				}
  				return ret;
  		  })
  		: [];
  	$$.update();
  	ready = true;
  	run_all($$.before_update);
  	// `false` as a special case of no DOM component
  	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
  	if (options.target) {
  		if (options.hydrate) {
  			const nodes = children(options.target);
  			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  			$$.fragment && $$.fragment.l(nodes);
  			nodes.forEach(detach);
  		} else {
  			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  			$$.fragment && $$.fragment.c();
  		}
  		if (options.intro) transition_in(component.$$.fragment);
  		mount_component(component, options.target, options.anchor);
  		flush();
  	}
  	set_current_component(parent_component);
  }

  /**
   * Base class for Svelte components. Used when dev=false.
   *
   * @template {Record<string, any>} [Props=any]
   * @template {Record<string, any>} [Events=any]
   */
  class SvelteComponent {
  	/**
  	 * ### PRIVATE API
  	 *
  	 * Do not use, may change at any time
  	 *
  	 * @type {any}
  	 */
  	$$ = undefined;
  	/**
  	 * ### PRIVATE API
  	 *
  	 * Do not use, may change at any time
  	 *
  	 * @type {any}
  	 */
  	$$set = undefined;

  	/** @returns {void} */
  	$destroy() {
  		destroy_component(this, 1);
  		this.$destroy = noop;
  	}

  	/**
  	 * @template {Extract<keyof Events, string>} K
  	 * @param {K} type
  	 * @param {((e: Events[K]) => void) | null | undefined} callback
  	 * @returns {() => void}
  	 */
  	$on(type, callback) {
  		if (!is_function(callback)) {
  			return noop;
  		}
  		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
  		callbacks.push(callback);
  		return () => {
  			const index = callbacks.indexOf(callback);
  			if (index !== -1) callbacks.splice(index, 1);
  		};
  	}

  	/**
  	 * @param {Partial<Props>} props
  	 * @returns {void}
  	 */
  	$set(props) {
  		if (this.$$set && !is_empty(props)) {
  			this.$$.skip_bound = true;
  			this.$$set(props);
  			this.$$.skip_bound = false;
  		}
  	}
  }

  /**
   * @typedef {Object} CustomElementPropDefinition
   * @property {string} [attribute]
   * @property {boolean} [reflect]
   * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
   */

  // generated during release, do not modify

  const PUBLIC_VERSION = '4';

  if (typeof window !== 'undefined')
  	// @ts-ignore
  	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

  /* hud\hud.svelte generated by Svelte v4.2.0 */

  const { window: window_1 } = globals;

  function add_css(target) {
  	append_styles(target, "svelte-17j758w", ".hud.svelte-17j758w.svelte-17j758w{position:absolute;top:10px;left:10px;width:300px;height:200px;z-index:999999999999;background-color:rgba(0, 0, 0, 0.9);border-radius:0.5em;display:flex;flex-direction:column;justify-content:space-evenly;align-items:center;color:white}.hud.svelte-17j758w .row.svelte-17j758w{display:flex;flex-direction:row;justify-content:center;align-items:center}.hud.svelte-17j758w .answer.svelte-17j758w{width:70%;height:50px;font-family:Verdana, Geneva, Tahoma, sans-serif;font-size:1em;border-radius:0.5em;background-color:white;color:black;border:none;transition:transform 0.3s ease}.hud.svelte-17j758w .answer.svelte-17j758w:active{transform:scale(0.93)}.hud.svelte-17j758w input[type=checkbox].svelte-17j758w{width:20px;height:20px;margin-left:10px}.hud.svelte-17j758w .help.svelte-17j758w{display:flex;flex-direction:column;align-items:center}.hud.svelte-17j758w .helpControl button.svelte-17j758w{width:25px;height:25px;border-radius:0.5em;background-color:white;border:none;transition:transform 0.3s ease;margin:5px;color:black}");
  }

  // (28:0) {#if visible}
  function create_if_block(ctx) {
  	let div6;
  	let button0;
  	let t1;
  	let div1;
  	let div0;
  	let t3;
  	let input;
  	let t4;
  	let div5;
  	let div2;
  	let t6;
  	let div4;
  	let button1;
  	let t8;
  	let div3;
  	let t9_value = /*helpModes*/ ctx[2][/*exposes*/ ctx[1].helpMode] + "";
  	let t9;
  	let t10;
  	let button2;
  	let mounted;
  	let dispose;

  	return {
  		c() {
  			div6 = element("div");
  			button0 = element("button");
  			button0.textContent = "Answer Question";
  			t1 = space();
  			div1 = element("div");
  			div0 = element("div");
  			div0.textContent = "Show Answer";
  			t3 = space();
  			input = element("input");
  			t4 = space();
  			div5 = element("div");
  			div2 = element("div");
  			div2.textContent = "Help Mode";
  			t6 = space();
  			div4 = element("div");
  			button1 = element("button");
  			button1.textContent = "<";
  			t8 = space();
  			div3 = element("div");
  			t9 = text(t9_value);
  			t10 = space();
  			button2 = element("button");
  			button2.textContent = ">";
  			attr(button0, "class", "answer svelte-17j758w");
  			attr(input, "type", "checkbox");
  			attr(input, "class", "svelte-17j758w");
  			attr(div1, "class", "row svelte-17j758w");
  			attr(button1, "class", "svelte-17j758w");
  			attr(div3, "class", "display");
  			attr(button2, "class", "svelte-17j758w");
  			attr(div4, "class", "row helpControl svelte-17j758w");
  			attr(div5, "class", "help svelte-17j758w");
  			attr(div6, "class", "hud svelte-17j758w");
  		},
  		m(target, anchor) {
  			insert(target, div6, anchor);
  			append(div6, button0);
  			append(div6, t1);
  			append(div6, div1);
  			append(div1, div0);
  			append(div1, t3);
  			append(div1, input);
  			input.checked = /*exposes*/ ctx[1].showAnswer;
  			append(div6, t4);
  			append(div6, div5);
  			append(div5, div2);
  			append(div5, t6);
  			append(div5, div4);
  			append(div4, button1);
  			append(div4, t8);
  			append(div4, div3);
  			append(div3, t9);
  			append(div4, t10);
  			append(div4, button2);

  			if (!mounted) {
  				dispose = [
  					listen(button0, "click", function () {
  						if (is_function(/*exposes*/ ctx[1].answerQuestion?.())) /*exposes*/ ctx[1].answerQuestion?.().apply(this, arguments);
  					}),
  					listen(input, "change", /*input_change_handler*/ ctx[5]),
  					listen(input, "change", /*change_handler*/ ctx[6]),
  					listen(button1, "click", /*click_handler*/ ctx[7]),
  					listen(button2, "click", /*click_handler_1*/ ctx[8])
  				];

  				mounted = true;
  			}
  		},
  		p(new_ctx, dirty) {
  			ctx = new_ctx;

  			if (dirty & /*exposes*/ 2) {
  				input.checked = /*exposes*/ ctx[1].showAnswer;
  			}

  			if (dirty & /*exposes*/ 2 && t9_value !== (t9_value = /*helpModes*/ ctx[2][/*exposes*/ ctx[1].helpMode] + "")) set_data(t9, t9_value);
  		},
  		d(detaching) {
  			if (detaching) {
  				detach(div6);
  			}

  			mounted = false;
  			run_all(dispose);
  		}
  	};
  }

  function create_fragment(ctx) {
  	let if_block_anchor;
  	let mounted;
  	let dispose;
  	let if_block = /*visible*/ ctx[0] && create_if_block(ctx);

  	return {
  		c() {
  			if (if_block) if_block.c();
  			if_block_anchor = empty();
  		},
  		m(target, anchor) {
  			if (if_block) if_block.m(target, anchor);
  			insert(target, if_block_anchor, anchor);

  			if (!mounted) {
  				dispose = listen(window_1, "keydown", /*keydown_handler*/ ctx[4]);
  				mounted = true;
  			}
  		},
  		p(ctx, [dirty]) {
  			if (/*visible*/ ctx[0]) {
  				if (if_block) {
  					if_block.p(ctx, dirty);
  				} else {
  					if_block = create_if_block(ctx);
  					if_block.c();
  					if_block.m(if_block_anchor.parentNode, if_block_anchor);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}
  		},
  		i: noop,
  		o: noop,
  		d(detaching) {
  			if (detaching) {
  				detach(if_block_anchor);
  			}

  			if (if_block) if_block.d(detaching);
  			mounted = false;
  			dispose();
  		}
  	};
  }

  function instance($$self, $$props, $$invalidate) {
  	let visible = true;

  	let exposes = {
  		answerQuestion: undefined,
  		onHelpModeChange: undefined,
  		onShowAnswerChange: undefined,
  		helpMode: 0,
  		showAnswer: false
  	};

  	const helpModes = [
  		'None',
  		'Auto Answer (instant)',
  		'Auto Answer (wait)',
  		'Outline Correct Answer'
  	];

  	const changeHelpMode = delta => {
  		$$invalidate(1, exposes.helpMode += delta, exposes);
  		if (exposes.helpMode < 0) $$invalidate(1, exposes.helpMode += helpModes.length, exposes);
  		$$invalidate(1, exposes.helpMode = exposes.helpMode % helpModes.length, exposes);
  		exposes.onHelpModeChange?.(exposes.helpMode);
  	};

  	window.qlc.addHudInteract(exposes);

  	const keydown_handler = e => {
  		if (e.key === '\\') $$invalidate(0, visible = !visible);
  	};

  	function input_change_handler() {
  		exposes.showAnswer = this.checked;
  		$$invalidate(1, exposes);
  	}

  	const change_handler = () => exposes.onShowAnswerChange?.(exposes.showAnswer);
  	const click_handler = () => changeHelpMode(-1);
  	const click_handler_1 = () => changeHelpMode(1);

  	return [
  		visible,
  		exposes,
  		helpModes,
  		changeHelpMode,
  		keydown_handler,
  		input_change_handler,
  		change_handler,
  		click_handler,
  		click_handler_1
  	];
  }

  class Hud extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
  	}
  }

  window.qlc = new Cheat();
  console.log(`Quizlet Live Cheat v${version} loaded!`);
  window.addEventListener('load', () => {
      new Hud({
          target: document.body
      });
  });

})();
