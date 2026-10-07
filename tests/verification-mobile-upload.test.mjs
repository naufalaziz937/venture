import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { validateImageFiles } from '../lib/uploads.mjs';

// Execute the actual JSX/hooks with deterministic hook scheduling and API responses.
// No external DOM/test dependencies and no real identities or storage writes.
function hooks() {
    let cursor = 0;
    const slots = [], effects = [];
    return {
        begin() { cursor = 0; },
        flush() { while (effects.length) effects.shift()(); },
        react: {
            useState(initial) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = initial;
                return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
            },
            useRef(initial) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = { current: initial };
                return slots[index];
            },
            useEffect(callback, dependencies) {
                const index = cursor++;
                const previous = slots[index];
                if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
                    slots[index] = { dependencies };
                    effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
                }
            },
        },
    };
}
async function loadJsx(file, modules) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const exports = {};
    const jsx = (type, props) => ({ type, props });
    new Function('require', 'exports', output)(name => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
        if (!(name in modules)) throw new Error('Unexpected module: ' + name);
        return modules[name];
    }, exports);
    return exports;
}
function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(tree) {
    if (tree == null || typeof tree === 'boolean') return '';
    if (typeof tree !== 'object') return String(tree);
    return [tree.props?.children].flat(Infinity).map(text).join('');
}
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && text(node) === label); }
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve, reject;
    const promise = new Promise((a,b) => { resolve = a; reject = b; });
    return { promise, resolve, reject };
}
async function formHarness(api) {
    const runtime = hooks();
    const status = { verification: { status: 'NOT_SUBMITTED' }, loading: false, error: '' };
    const messages = [];
    let options;
    const Page = (await loadJsx('app/account/verification/page.jsx', {
        react: runtime.react, axios: api,
        'react-hot-toast': { error: value => messages.push(value), success: value => messages.push(value) },
        '@/components/Navbar': () => null, '@/components/Footer': () => null,
        '@/context/AppContext': { useAppContext: () => ({ user: { id: 'synthetic-user', fullName: 'Synthetic Name' }, getToken: async () => 'synthetic-token', isAuthLoaded: true }) },
        '@clerk/nextjs': { useClerk: () => ({ openSignIn() {} }) },
        '@/components/VerificationStatus': {
            useVerification: value => { options = value; return { ...status, setVerification: next => { status.verification = next; } }; },
            VerificationBadge: () => null,
        },
        '@/lib/uploads.mjs': { validateImageFiles },
    })).default;
    const render = () => { runtime.begin(); const tree = Page(); runtime.flush(); return tree; };
    const select = (tree, file) => {
        const target = { files: [file], value: 'fakepath' };
        nodes(tree).find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ currentTarget: target });
        assert.equal(target.value, '');
    };
    let tree = render();
    button(tree, 'Start Verification').props.onClick();
    tree = render();
    return { render, select, status, messages, options: () => options, tree };
}
const png = () => new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'mobile-camera.png', { type: 'image/png' });
async function complete(h) {
    const document = png(), selfie = png();
    h.select(h.render(), document);
    button(h.render(),'Continue').props.onClick();
    h.select(h.render(), selfie);
    button(h.render(),'Back').props.onClick();
    assert.match(text(h.render()), /Image selected/);
    button(h.render(),'Continue').props.onClick();
    assert.match(text(h.render()), /Image selected/);
    button(h.render(),'Continue').props.onClick();
    let tree = h.render();
    for (const input of nodes(tree).filter(node => node.type === 'input')) input.props.onChange({ target: { value: input.props.type === 'tel' ? '+628000000000' : 'Synthetic Name' } });
    nodes(tree).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Synthetic address' } });
    button(h.render(),'Continue').props.onClick();
    tree = h.render();
    for (const input of nodes(tree).filter(node => node.type === 'input')) input.props.onChange({ target: { value: input.props.type === 'tel' ? '+628000000001' : 'Synthetic Contact' } });
    button(h.render(),'Continue').props.onClick();
    nodes(h.render()).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
    return { document, selfie };
}
test('mobile focus/loading cannot detach active file input; selected document/selfie survive back and rerender', async () => {
    let calls = 0;
    const h = await formHarness(() => { calls++; });
    assert.equal(h.options().refreshOnFocus, false);
    h.status.loading = true;
    h.status.error = 'Temporary refresh failure';
    assert.ok(nodes(h.render()).find(node => node.type === 'input' && node.props.type === 'file'));
    h.select(h.render(), png());
    assert.match(text(h.render()), /Image selected/);
    assert.match(text(h.render()), /Replace Image/);
    assert.equal(calls,0);
    h.status.loading = false; h.status.error = '';
    await complete(h);
    assert.equal(calls,0);
    assert.equal(nodes(h.render()).filter(node => node.type === 'img').length,2);
});
test('mobile format/size errors preserve previous valid preview and allow same-file replacement', async () => {
    const h = await formHarness(() => { throw new Error('Unexpected upload'); });
    h.select(h.render(), png());
    h.select(h.render(), new File(['x'], 'camera.heic', { type: 'image/heic' }));
    assert.match(text(h.render()), /Unsupported image format/);
    assert.ok(nodes(h.render()).find(node => node.type === 'img'));
    h.select(h.render(), new File([new Uint8Array(5*1024*1024+1)], 'large.jpg', { type: 'image/jpeg' }));
    assert.match(text(h.render()), /Maximum size is 5 MB/);
    h.select(h.render(), png());
    assert.doesNotMatch(text(h.render()), /Maximum size|Unsupported image/);
});
test('slow submission sends real Files once; network failure retains images and retries only on action', async () => {
    const requests = [], first = deferred(), second = deferred();
    const h = await formHarness(config => { requests.push(config); return requests.length === 1 ? first.promise : second.promise; });
    const selected = await complete(h);
    const submit = button(h.render(),'Submit Verification');
    submit.props.onClick();
    submit.props.onClick();
    await tick();
    assert.equal(requests.length,1);
    const form = requests[0].data;
    assert.equal(form.get('documentImage'), selected.document);
    assert.equal(form.get('selfieImage'), selected.selfie);
    assert.ok(form.get('documentImage') instanceof File);
    assert.match(text(h.render()), /Uploading/);
    assert.equal(button(h.render(),'Submit Verification').props.disabled,true);
    first.reject(new Error('Synthetic network interruption'));
    await tick();
    assert.equal(requests.length,1);
    assert.equal(nodes(h.render()).filter(node => node.type === 'img').length,2);
    assert.match(text(h.render()), /Check your connection and retry/);
    button(h.render(),'Retry Upload').props.onClick();
    await tick();
    assert.equal(requests.length,2);
    assert.equal(requests[1].data.get('documentImage'), selected.document);
    second.resolve({ data: { success: true, verification: { status: 'PENDING', documentType: 'KTP', submittedAt: new Date().toISOString() } } });
    await tick();
    assert.match(text(h.render()), /Verification Pending/);
});
test('verification focus refresh keeps loading false after initial fetch and deduplicates focus requests', async () => {
    const runtime = hooks(), events = new Map(), requests = [];
    const priorWindow = globalThis.window;
    globalThis.window = { addEventListener: (key, fn) => events.set(key,fn), removeEventListener: (key, fn) => { if(events.get(key) === fn) events.delete(key); } };
    try {
        const getToken = async () => 'synthetic-token';
        const module = await loadJsx('components/VerificationStatus.jsx', {
            react: runtime.react, axios: { get: () => { const request = deferred(); requests.push(request); return request.promise; } },
            'next/link': () => null,
            '@/context/AppContext': { useAppContext: () => ({ user: { id: 'synthetic-user' }, getToken, isAuthLoaded: true }) },
        });
        const render = (options) => { runtime.begin(); const value = module.useVerification(options); runtime.flush(); return value; };
        assert.equal(render().loading,true);
        await tick();
        requests[0].resolve({ data: { verification: { status: 'NOT_SUBMITTED' } } });
        await tick();
        assert.equal(render().loading,false);
        events.get('focus')(); events.get('focus')();
        await tick();
        assert.equal(requests.length,2);
        assert.equal(render().loading,false);
        requests[1].resolve({ data: { verification: { status: 'NOT_SUBMITTED' } } });
        await tick();
        render({ refreshOnFocus: false });
        assert.equal(events.has('focus'),false);
        await tick();
        assert.equal(requests.length,2);
    } finally { globalThis.window = priorWindow; }
});
