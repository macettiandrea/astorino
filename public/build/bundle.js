
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
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
        flushing = false;
        seen_callbacks.clear();
    }
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
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
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
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
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.44.1 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div1;
    	let b0;
    	let t2;
    	let ul0;
    	let li0;
    	let t4;
    	let li1;
    	let t6;
    	let li2;
    	let t8;
    	let li3;
    	let t10;
    	let li4;
    	let t12;
    	let li5;
    	let t14;
    	let b1;
    	let t16;
    	let ul1;
    	let li6;
    	let t18;
    	let li7;
    	let t20;
    	let li8;
    	let t22;
    	let li9;
    	let t24;
    	let b2;
    	let t26;
    	let ul2;
    	let li10;
    	let t28;
    	let li11;
    	let t30;
    	let b3;
    	let t32;
    	let ul3;
    	let li12;
    	let t34;
    	let li13;
    	let t36;
    	let li14;
    	let t38;
    	let b4;
    	let t40;
    	let ul4;
    	let li15;
    	let t42;
    	let b5;
    	let t44;
    	let ul5;
    	let li16;
    	let t46;
    	let li17;
    	let t48;
    	let li18;
    	let t50;
    	let li19;
    	let t52;
    	let li20;
    	let t54;
    	let li21;
    	let t56;
    	let li22;
    	let t58;
    	let li23;
    	let t60;
    	let li24;
    	let t62;
    	let li25;
    	let t64;
    	let li26;
    	let t66;
    	let li27;
    	let t68;
    	let div2;
    	let table;
    	let tbody;
    	let tr;
    	let td0;
    	let img1;
    	let img1_src_value;
    	let t69;
    	let td1;
    	let img2;
    	let img2_src_value;
    	let t70;
    	let td2;
    	let img3;
    	let img3_src_value;
    	let t71;
    	let div3;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div1 = element("div");
    			b0 = element("b");
    			b0.textContent = "Valori nutrizionali per 100g";
    			t2 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Energia:KJ 1480 / Kcal 350";
    			t4 = space();
    			li1 = element("li");
    			li1.textContent = "Grassi totali:1,0g di cui acidi grassi saturi 0,2g";
    			t6 = space();
    			li2 = element("li");
    			li2.textContent = "Carboidrati:71g di cui zuccheri 3,4g";
    			t8 = space();
    			li3 = element("li");
    			li3.textContent = "Fibre:2,9g";
    			t10 = space();
    			li4 = element("li");
    			li4.textContent = "Proteine:13g";
    			t12 = space();
    			li5 = element("li");
    			li5.textContent = "Sale:0,02g";
    			t14 = space();
    			b1 = element("b");
    			b1.textContent = "Ingredienti ed Allergeni";
    			t16 = space();
    			ul1 = element("ul");
    			li6 = element("li");
    			li6.textContent = "Ingredienti: Semola di grano duro 100% italiana e acqua.";
    			t18 = space();
    			li7 = element("li");
    			li7.textContent = "Il prodotto non contiene: Additivi/O.G.M";
    			t20 = space();
    			li8 = element("li");
    			li8.textContent = "Caratteristiche organolettiche: colore dorato / odore di grano";
    			t22 = space();
    			li9 = element("li");
    			li9.textContent = "Allergenici: Glutine";
    			t24 = space();
    			b2 = element("b");
    			b2.textContent = "Cottura e Conservazione";
    			t26 = space();
    			ul2 = element("ul");
    			li10 = element("li");
    			li10.textContent = "Tempi di cottura: 10/11 min";
    			t28 = space();
    			li11 = element("li");
    			li11.textContent = "Modalità di conservazione: conservare in luogo fresco e asciutto";
    			t30 = space();
    			b3 = element("b");
    			b3.textContent = "Formato Confezione";
    			t32 = space();
    			ul3 = element("ul");
    			li12 = element("li");
    			li12.textContent = "Formato: 500g";
    			t34 = space();
    			li13 = element("li");
    			li13.textContent = "Codice prodotto: 01002002";
    			t36 = space();
    			li14 = element("li");
    			li14.textContent = "Codice Ean: 8-032601880134";
    			t38 = space();
    			b4 = element("b");
    			b4.textContent = "Provenienza Grano";
    			t40 = space();
    			ul4 = element("ul");
    			li15 = element("li");
    			li15.textContent = "ITALIA (SICILIA)";
    			t42 = space();
    			b5 = element("b");
    			b5.textContent = "CERTIFICAZIONE DI ANALISI CHIMICO-FISICHE";
    			t44 = space();
    			ul5 = element("ul");
    			li16 = element("li");
    			li16.textContent = "UMIDITA' % su t.q. 14,40 NIR";
    			t46 = space();
    			li17 = element("li");
    			li17.textContent = "CENERI % su s.s.: 0,72 NIR";
    			t48 = space();
    			li18 = element("li");
    			li18.textContent = "PROTEINE % s.s.: 12,20 NIR";
    			t50 = space();
    			li19 = element("li");
    			li19.textContent = "QUANTITA’ DI GLUTINE % su s.s.: 10,28 GLUTOMATIC";
    			t52 = space();
    			li20 = element("li");
    			li20.textContent = "INDICE DI GLUTINE % su s.s.: 78,94 GLUTOMATIC";
    			t54 = space();
    			li21 = element("li");
    			li21.textContent = "INDICE DI GIALLO “b” su t.q.: 26,97 MINOLTA CR 300";
    			t56 = space();
    			li22 = element("li");
    			li22.textContent = "GRANULOMETRIA (% ):";
    			t58 = space();
    			li23 = element("li");
    			li23.textContent = "rifiuto setaccio 500 micron 15,46%";
    			t60 = space();
    			li24 = element("li");
    			li24.textContent = "rifiuto setaccio 425 micron 11,96%";
    			t62 = space();
    			li25 = element("li");
    			li25.textContent = "rifiuto setaccio 250 micron 66,82%";
    			t64 = space();
    			li26 = element("li");
    			li26.textContent = "rifiuto setaccio 180 micron 5,71%";
    			t66 = space();
    			li27 = element("li");
    			li27.textContent = "fondo 0,05%";
    			t68 = space();
    			div2 = element("div");
    			table = element("table");
    			tbody = element("tbody");
    			tr = element("tr");
    			td0 = element("td");
    			img1 = element("img");
    			t69 = space();
    			td1 = element("td");
    			img2 = element("img");
    			t70 = space();
    			td2 = element("td");
    			img3 = element("img");
    			t71 = space();
    			div3 = element("div");
    			attr_dev(img0, "id", "img1");
    			if (!src_url_equal(img0.src, img0_src_value = "images/pasta2.jpeg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "rounded float-left svelte-wdk4q0");
    			attr_dev(img0, "alt", "Immagine Pasta");
    			add_location(img0, file, 6, 2, 55);
    			attr_dev(div0, "class", "immagine");
    			add_location(div0, file, 5, 1, 30);
    			add_location(b0, file, 10, 2, 177);
    			add_location(li0, file, 12, 3, 223);
    			add_location(li1, file, 13, 4, 263);
    			add_location(li2, file, 14, 5, 328);
    			add_location(li3, file, 15, 6, 380);
    			add_location(li4, file, 16, 7, 407);
    			add_location(li5, file, 17, 8, 437);
    			add_location(ul0, file, 11, 2, 215);
    			add_location(b1, file, 19, 2, 467);
    			add_location(li6, file, 21, 3, 509);
    			add_location(li7, file, 22, 4, 579);
    			add_location(li8, file, 23, 5, 634);
    			add_location(li9, file, 24, 5, 711);
    			add_location(ul1, file, 20, 2, 501);
    			add_location(b2, file, 26, 2, 751);
    			add_location(li10, file, 28, 3, 792);
    			add_location(li11, file, 29, 4, 833);
    			add_location(ul2, file, 27, 2, 784);
    			add_location(b3, file, 31, 2, 916);
    			add_location(li12, file, 33, 2, 951);
    			add_location(li13, file, 34, 3, 977);
    			add_location(li14, file, 35, 4, 1016);
    			add_location(ul3, file, 32, 2, 944);
    			add_location(b4, file, 37, 2, 1062);
    			add_location(li15, file, 39, 2, 1096);
    			add_location(ul4, file, 38, 2, 1089);
    			add_location(b5, file, 42, 3, 1135);
    			add_location(li16, file, 44, 3, 1195);
    			add_location(li17, file, 46, 4, 1240);
    			add_location(li18, file, 48, 5, 1284);
    			add_location(li19, file, 50, 6, 1329);
    			add_location(li20, file, 52, 7, 1396);
    			add_location(li21, file, 54, 8, 1460);
    			add_location(li22, file, 56, 9, 1531);
    			add_location(li23, file, 58, 10, 1572);
    			add_location(li24, file, 60, 11, 1629);
    			add_location(li25, file, 62, 12, 1687);
    			add_location(li26, file, 64, 13, 1745);
    			add_location(li27, file, 66, 14, 1803);
    			add_location(ul5, file, 43, 3, 1187);
    			attr_dev(div1, "class", "div2 svelte-wdk4q0");
    			add_location(div1, file, 9, 1, 156);
    			if (!src_url_equal(img1.src, img1_src_value = "images/certificato1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "rounded float-left");
    			attr_dev(img1, "alt", " ");
    			add_location(img1, file, 76, 33, 1926);
    			attr_dev(td0, "valign", "”top”");
    			attr_dev(td0, "width", "”186″");
    			add_location(td0, file, 76, 3, 1896);
    			if (!src_url_equal(img2.src, img2_src_value = "images/certificato2.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "rounded float-left");
    			attr_dev(img2, "alt", " ");
    			add_location(img2, file, 77, 32, 2034);
    			attr_dev(td1, "valign", "”top”");
    			attr_dev(td1, "width", "”186″");
    			add_location(td1, file, 77, 3, 2005);
    			if (!src_url_equal(img3.src, img3_src_value = "images/certificato3.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "rounded float-left");
    			attr_dev(img3, "alt", " ");
    			add_location(img3, file, 78, 32, 2142);
    			attr_dev(td2, "valign", "”top”");
    			attr_dev(td2, "width", "”186″");
    			add_location(td2, file, 78, 3, 2113);
    			add_location(tr, file, 75, 3, 1888);
    			add_location(tbody, file, 74, 3, 1877);
    			attr_dev(table, "class", "certificati svelte-wdk4q0");
    			add_location(table, file, 73, 2, 1846);
    			add_location(div2, file, 72, 1, 1838);
    			set_style(div3, "clear", "both");
    			add_location(div3, file, 84, 1, 2263);
    			attr_dev(main, "class", "svelte-wdk4q0");
    			add_location(main, file, 4, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, img0);
    			append_dev(main, t0);
    			append_dev(main, div1);
    			append_dev(div1, b0);
    			append_dev(div1, t2);
    			append_dev(div1, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t4);
    			append_dev(ul0, li1);
    			append_dev(ul0, t6);
    			append_dev(ul0, li2);
    			append_dev(ul0, t8);
    			append_dev(ul0, li3);
    			append_dev(ul0, t10);
    			append_dev(ul0, li4);
    			append_dev(ul0, t12);
    			append_dev(ul0, li5);
    			append_dev(div1, t14);
    			append_dev(div1, b1);
    			append_dev(div1, t16);
    			append_dev(div1, ul1);
    			append_dev(ul1, li6);
    			append_dev(ul1, t18);
    			append_dev(ul1, li7);
    			append_dev(ul1, t20);
    			append_dev(ul1, li8);
    			append_dev(ul1, t22);
    			append_dev(ul1, li9);
    			append_dev(div1, t24);
    			append_dev(div1, b2);
    			append_dev(div1, t26);
    			append_dev(div1, ul2);
    			append_dev(ul2, li10);
    			append_dev(ul2, t28);
    			append_dev(ul2, li11);
    			append_dev(div1, t30);
    			append_dev(div1, b3);
    			append_dev(div1, t32);
    			append_dev(div1, ul3);
    			append_dev(ul3, li12);
    			append_dev(ul3, t34);
    			append_dev(ul3, li13);
    			append_dev(ul3, t36);
    			append_dev(ul3, li14);
    			append_dev(div1, t38);
    			append_dev(div1, b4);
    			append_dev(div1, t40);
    			append_dev(div1, ul4);
    			append_dev(ul4, li15);
    			append_dev(div1, t42);
    			append_dev(div1, b5);
    			append_dev(div1, t44);
    			append_dev(div1, ul5);
    			append_dev(ul5, li16);
    			append_dev(ul5, t46);
    			append_dev(ul5, li17);
    			append_dev(ul5, t48);
    			append_dev(ul5, li18);
    			append_dev(ul5, t50);
    			append_dev(ul5, li19);
    			append_dev(ul5, t52);
    			append_dev(ul5, li20);
    			append_dev(ul5, t54);
    			append_dev(ul5, li21);
    			append_dev(ul5, t56);
    			append_dev(ul5, li22);
    			append_dev(ul5, t58);
    			append_dev(ul5, li23);
    			append_dev(ul5, t60);
    			append_dev(ul5, li24);
    			append_dev(ul5, t62);
    			append_dev(ul5, li25);
    			append_dev(ul5, t64);
    			append_dev(ul5, li26);
    			append_dev(ul5, t66);
    			append_dev(ul5, li27);
    			append_dev(main, t68);
    			append_dev(main, div2);
    			append_dev(div2, table);
    			append_dev(table, tbody);
    			append_dev(tbody, tr);
    			append_dev(tr, td0);
    			append_dev(td0, img1);
    			append_dev(tr, t69);
    			append_dev(tr, td1);
    			append_dev(td1, img2);
    			append_dev(tr, t70);
    			append_dev(tr, td2);
    			append_dev(td2, img3);
    			append_dev(main, t71);
    			append_dev(main, div3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
