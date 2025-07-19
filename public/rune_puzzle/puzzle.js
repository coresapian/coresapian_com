// --- ORRERY PUZZLE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const orreryContainer = document.getElementById('orrery-container');
    const orreryHeart = document.getElementById('orrery-heart');
    const svgLines = document.getElementById('orrery-energy-lines-svg');
    const secretMessageDisplay = document.getElementById('secret-message-display');

    const puzzleConfig = {
        solution: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚩ', 'ᚱ', 'ᚳ'], // F, U, TH, O, R, C
        decoys: ['ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛟ', 'ᛞ'],
        socketPlaceholder: '✧',
        secretMessage: 'STARLIGHT BORN OF WISDOM',
    };

    let sockets = [];
    let glyphs = [];
    let activeDrag = null;
    let puzzleSolved = false;

    function initializePuzzle() {
        createSockets();
        createGlyphs();
    }

    function createSockets() {
        const numSockets = puzzleConfig.solution.length;
        const radius = orreryContainer.offsetWidth * 0.35;

        for (let i = 0; i < numSockets; i++) {
            const angle = (i / numSockets) * 2 * Math.PI - (Math.PI / 2); // Start from top
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const socket = document.createElement('div');
            socket.classList.add('constellation-socket');
            socket.dataset.socketId = i;
            socket.dataset.correctGlyph = puzzleConfig.solution[i];
            socket.style.transform = `translate(${x}px, ${y}px)`;

            const placeholder = document.createElement('span');
            placeholder.classList.add('socket-glyph-placeholder');
            placeholder.textContent = puzzleConfig.socketPlaceholder;
            socket.appendChild(placeholder);

            orreryContainer.appendChild(socket);
            sockets.push(socket);
        }
    }

    function createGlyphs() {
        const allGlyphChars = [...puzzleConfig.solution, ...puzzleConfig.decoys].sort(() => Math.random() - 0.5);
        const spawnRect = orreryContainer.getBoundingClientRect();

        allGlyphChars.forEach(char => {
            const glyph = document.createElement('div');
            glyph.classList.add('starlight-glyph');
            if (puzzleConfig.decoys.includes(char)) {
                glyph.classList.add('decoy');
            }
            glyph.textContent = char;
            glyph.dataset.glyph = char;

            // Avoid spawning on top of the heart
            let posX, posY, dist;
            do {
                posX = Math.random() * spawnRect.width - spawnRect.width / 2;
                posY = Math.random() * spawnRect.height - spawnRect.height / 2;
                dist = Math.sqrt(posX*posX + posY*posY);
            } while (dist < orreryHeart.offsetWidth);

            glyph.style.left = `calc(50% + ${posX}px)`;
            glyph.style.top = `calc(50% + ${posY}px)`;

            orreryContainer.appendChild(glyph);
            glyphs.push(glyph);

            glyph.addEventListener('mousedown', startDrag);
            glyph.addEventListener('touchstart', startDrag, { passive: false });
        });
    }

    function startDrag(e) {
        if (puzzleSolved || e.target.classList.contains('locked')) return;
        e.preventDefault();

        const targetElement = e.target;
        const rect = targetElement.getBoundingClientRect();
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

        activeDrag = {
            element: targetElement,
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top,
        };

        targetElement.classList.add('dragging');
        gsap.to(targetElement, { scale: 1.2, duration: 0.2 });

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function onDrag(e) {
        if (!activeDrag) return;
        e.preventDefault();

        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

        gsap.to(activeDrag.element, {
            x: clientX - activeDrag.offsetX - (window.innerWidth / 2) + (activeDrag.element.offsetWidth / 2),
            y: clientY - activeDrag.offsetY - (window.innerHeight / 2) + (activeDrag.element.offsetHeight / 2),
            duration: 0.1,
        });

        checkSocketResonance(clientX, clientY);
    }

    function endDrag(e) {
        if (!activeDrag) return;

        const glyph = activeDrag.element;
        glyph.classList.remove('dragging');
        gsap.to(glyph, { scale: 1, duration: 0.2 });

        const resonatingSocket = document.querySelector('.constellation-socket.resonating');
        if (resonatingSocket && !resonatingSocket.classList.contains('filled')) {
            handleGlyphPlacement(glyph, resonatingSocket);
        } else {
            // Optional: snap back to original position if not placed
            gsap.to(glyph, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        }

        sockets.forEach(s => s.classList.remove('resonating'));
        activeDrag = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', endDrag);
    }

    function checkSocketResonance(clientX, clientY) {
        sockets.forEach(socket => {
            if (socket.classList.contains('filled')) return;
            const rect = socket.getBoundingClientRect();
            const distance = Math.sqrt(Math.pow(rect.x + rect.width / 2 - clientX, 2) + Math.pow(rect.y + rect.height / 2 - clientY, 2));
            if (distance < rect.width * 0.7) {
                socket.classList.add('resonating');
            } else {
                socket.classList.remove('resonating');
            }
        });
    }

    function handleGlyphPlacement(glyph, socket) {
        if (glyph.dataset.glyph === socket.dataset.correctGlyph) {
            // Correct placement
            socket.appendChild(glyph);
            socket.classList.add('filled');
            glyph.classList.add('locked');
            gsap.set(glyph, { x: 0, y: 0, position: 'static' }); // Reset GSAP transforms and let CSS handle it
            checkCompletion();
        } else {
            // Incorrect placement
            socket.classList.add('rejecting');
            glyph.classList.add('rejected-glyph');
            setTimeout(() => {
                socket.classList.remove('rejecting');
                glyph.classList.remove('rejected-glyph');
            }, 500);
            gsap.to(glyph, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        }
    }

    function checkCompletion() {
        const filledSockets = sockets.filter(s => s.classList.contains('filled'));
        if (filledSockets.length === sockets.length) {
            puzzleSolved = true;
            orreryHeart.classList.add('active');
            drawEnergyLines(true);
            revealSecretMessage();
        }
    }

    function drawEnergyLines(isComplete) {
        svgLines.innerHTML = ''; // Clear previous lines
        if (!isComplete) return;

        const center = { x: orreryContainer.offsetWidth / 2, y: orreryContainer.offsetHeight / 2 };

        sockets.forEach((socket, i) => {
            const sRect = socket.getBoundingClientRect();
            const oRect = orreryContainer.getBoundingClientRect();
            const x1 = sRect.left + sRect.width / 2 - oRect.left;
            const y1 = sRect.top + sRect.height / 2 - oRect.top;

            // Line to heart
            const lineToHeart = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineToHeart.setAttribute('x1', x1);
            lineToHeart.setAttribute('y1', y1);
            lineToHeart.setAttribute('x2', center.x);
            lineToHeart.setAttribute('y2', center.y);
            lineToHeart.classList.add('orrery-energy-line');
            svgLines.appendChild(lineToHeart);

            // Line to next socket
            const nextSocket = sockets[(i + 1) % sockets.length];
            const nRect = nextSocket.getBoundingClientRect();
            const x2 = nRect.left + nRect.width / 2 - oRect.left;
            const y2 = nRect.top + nRect.height / 2 - oRect.top;

            const lineToNext = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineToNext.setAttribute('x1', x1);
            lineToNext.setAttribute('y1', y1);
            lineToNext.setAttribute('x2', x2);
            lineToNext.setAttribute('y2', y2);
            lineToNext.classList.add('orrery-energy-line', 'outer-circle');
            svgLines.appendChild(lineToNext);
        });

        // Animate lines into view
        gsap.fromTo('.orrery-energy-line', { opacity: 0 }, { opacity: 0.85, stagger: 0.1, delay: 0.5, onComplete: () => {
            gsap.to('.orrery-energy-line', { className: '+=visible', duration: 0 });
        }});
    }

    function revealSecretMessage() {
        secretMessageDisplay.textContent = puzzleConfig.secretMessage;
        secretMessageDisplay.classList.add('visible');
    }



    initializePuzzle();
});
