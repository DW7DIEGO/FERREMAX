// Las escenas se cambian a petición del visitante para darle tiempo de leer.
const scenes = [
    {kind:'Herramientas eléctricas', title:['Manos a','la obra.'], description:'Taladros, sierras y accesorios para pasar del plano al primer corte.', image:'perforacion', alt:'Taladro perforando un tablero de madera en el taller', link:'products.html?category=herramientas', action:'Explorar herramientas'},
    {kind:'Herramientas manuales', title:['Golpe a','golpe.'], description:'Encuentra herramientas de mano para armar, ajustar y reparar.', image:'martillo', alt:'Martillo y clavos sobre madera', link:'products.html?category=herramientas', action:'Ver herramientas'},
    {kind:'Equipamiento de taller', title:['Prepara','tu taller.'], description:'Revisa el catálogo y reúne los materiales de tu próximo proyecto.', image:'banco', alt:'Taladro de banco en una mesa de trabajo', link:'products.html', action:'Explorar catálogo'}
];
let currentScene = 0;
let sceneRequest = 0;
async function changeScene(step) {
    const request = ++sceneRequest;
    currentScene = (currentScene + step + scenes.length) % scenes.length;
    const scene = scenes[currentScene];
    const image = new Image();
    image.id = 'scene-image';
    image.alt = scene.alt;
    image.src = '../img/' + scene.image + '.webp';
    try { await image.decode(); } catch { return; }
    if (request !== sceneRequest) return;
    document.getElementById('scene-image').replaceWith(image);
    const title = document.getElementById('scene-title');
    title.replaceChildren(scene.title[0],document.createElement('br'),scene.title[1]);
    document.getElementById('scene-kind').textContent = scene.kind;
    document.getElementById('scene-description').textContent = scene.description;
    const action = document.getElementById('scene-link');
    action.href = scene.link;
    action.firstChild.textContent = scene.action + ' ';
    document.getElementById('scene-count').textContent = '0' + (currentScene + 1) + ' / 03';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        title.animate([{opacity:0, transform:'translateY(10px)'},{opacity:1, transform:'none'}], {duration:300, easing:'ease-out'});
    }
}
document.getElementById('prev-scene').onclick = () => changeScene(-1);
document.getElementById('next-scene').onclick = () => changeScene(1);
