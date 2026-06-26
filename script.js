// Usamos el mismo observador que ya tienes configurado
    // para activar la clase 'active' cuando la imagen entra en pantalla

// Script para activar la animación al hacer scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.scroll-photo').forEach(img => {
        observer.observe(img);
    });

function refreshLucideIcons(){
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function trackInvitationEvent(eventName, details = {}) {
    const config = window.INVITACION_CONFIG || {};
    const formInfo = config.formulario || {};
    const invitados = Array.isArray(formInfo.invitados) ? formInfo.invitados : [];
    const payload = {
        invitacion: window.location.hostname,
        ruta: window.location.pathname,
        idConfirmacion: formInfo.idConfirmacion || '',
        invitado: invitados[0] || '',
        ...details
    };

    if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(eventName, payload);
    }
}

function notifyTelegram(eventName, details = {}) {
    const config = window.INVITACION_CONFIG || {};
    const formInfo = config.formulario || {};
    const invitados = Array.isArray(formInfo.invitados) ? formInfo.invitados : [];
    const notificationEndpoint = config.notificaciones?.endpoint || 'https://notificaciones.pocketstiven.com/notificar';
    const payload = {
        event: eventName,
        data: {
            invitacion: window.location.hostname,
            ruta: window.location.href,
            idConfirmacion: formInfo.idConfirmacion || '',
            invitado: invitados[0] || '',
            ...details
        }
    };

    fetch(notificationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch((error) => {
        console.warn('No se pudo enviar la notificacion de Telegram:', error);
    });
}

const form = document.getElementById('confirmationForm');
    const result = document.getElementById('result');
    const submitButton = form.querySelector('button[type="submit"]');
    const formSettings = window.INVITACION_CONFIG?.formulario || {};
    const confirmationStorageKey = `confirmacion-${formSettings.idConfirmacion || 'invitacion'}`;
    const confirmationEndpoint = formSettings.endpoint || form.getAttribute('action');

    function showFormMessage(type, message) {
        const styles = {
            loading: 'mt-4 rounded-2xl border border-olive-100 bg-olive-50 px-4 py-4 text-sm text-olive-900 font-medium',
            success: 'mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 font-medium',
            error: 'mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-800 font-medium',
            muted: 'mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-600 font-medium'
        };

        result.className = styles[type] || styles.muted;
        result.innerHTML = message;
    }

    function lockConfirmationForm() {
        form.querySelectorAll('input, select, button').forEach((field) => {
            field.disabled = true;
        });
        if (submitButton) {
            submitButton.textContent = 'Confirmación enviada';
        }
    }

    if (localStorage.getItem(confirmationStorageKey) === 'true') {
        lockConfirmationForm();
        showFormMessage('success', 'Tu confirmación ya fue enviada correctamente. Gracias por responder.');
    } else {
        result.className = 'hidden';
    }

    function getFormValue(name) {
        return (new FormData(form).get(name) || '').toString();
    }

    function getTransportLabel(value) {
        if (value === 'si') return 'S\u00ed, requiero el servicio de transporte';
        if (value === 'no') return 'No, llegar\u00e9 por mi cuenta';
        return value || '';
    }

    function getConfirmedGuestCount() {
        return ['nombre_principal', 'nombre_acompanante_1', 'nombre_acompanante_2', 'nombre_acompanante_3']
            .filter((name) => getFormValue(name)).length || 1;
    }

    function buildGoogleFormsPayload() {
        const entries = formSettings.googleEntries || {};
        const today = new Date();
        const payload = new Map();
        const set = (entry, value) => {
            if (entry && value !== undefined && value !== null) payload.set(entry, String(value));
        };

        set(entries.nombrePrincipal, getFormValue('nombre_principal'));
        set(entries.acompanante1, getFormValue('nombre_acompanante_1'));
        set(entries.acompanante2, getFormValue('nombre_acompanante_2'));
        set(entries.acompanante3, getFormValue('nombre_acompanante_3'));
        set(entries.transporte, getTransportLabel(getFormValue('transporte')));
        set(entries.idConfirmacion, formSettings.idConfirmacion || 'invitacion');
        set(entries.cupos, String(formSettings.cupos || 1));

        if (entries.fechaEnvio) {
            set(`${entries.fechaEnvio}_year`, today.getFullYear());
            set(`${entries.fechaEnvio}_month`, today.getMonth() + 1);
            set(`${entries.fechaEnvio}_day`, today.getDate());
        }

        set(entries.origen, window.location.href);
        return payload;
    }

    function submitToGoogleForms(payload) {
        const frameName = 'googleFormsFrame';
        let frame = document.getElementById(frameName);
        if (!frame) {
            frame = document.createElement('iframe');
            frame.name = frameName;
            frame.id = frameName;
            frame.style.display = 'none';
            document.body.appendChild(frame);
        }

        const hiddenForm = document.createElement('form');
        hiddenForm.action = confirmationEndpoint;
        hiddenForm.method = 'POST';
        hiddenForm.target = frameName;
        hiddenForm.style.display = 'none';

        payload.forEach((value, name) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            hiddenForm.appendChild(input);
        });

        document.body.appendChild(hiddenForm);
        HTMLFormElement.prototype.submit.call(hiddenForm);
        window.setTimeout(() => hiddenForm.remove(), 3000);
    }

    async function submitConfirmationToPocketBase() {
        const endpoint = 'https://www.pocketstiven.com/api/collections/confirmaciones/records';
        const payload = {
            idConfirmacion: formSettings.idConfirmacion || 'invitacion',
            nombrePrincipal: getFormValue('nombre_principal'),
            acompanante1: getFormValue('nombre_acompanante_1'),
            acompanante2: getFormValue('nombre_acompanante_2'),
            acompanante3: getFormValue('nombre_acompanante_3'),
            cupos: Number(formSettings.cupos || 1),
            transporte: getTransportLabel(getFormValue('transporte')),
            origen: window.location.href
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let detail = '';
            try {
                const errorData = await response.json();
                detail = errorData.message || JSON.stringify(errorData.data || errorData);
            } catch (error) {
                detail = await response.text();
            }
            throw new Error(detail || 'No se pudo guardar la confirmaci\u00f3n en PocketBase.');
        }
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (localStorage.getItem(confirmationStorageKey) === 'true') {
            lockConfirmationForm();
            showFormMessage('success', 'Tu confirmaci\u00f3n ya fue registrada anteriormente. No es necesario enviarla de nuevo.');
            return;
        }

        if (!confirmationEndpoint) {
            showFormMessage('error', 'No hay un formulario de confirmaci\u00f3n configurado.');
            return;
        }

        const payload = buildGoogleFormsPayload();
        showFormMessage('loading', 'Enviando tu confirmaci\u00f3n...');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
        }

        submitToGoogleForms(payload);
        submitConfirmationToPocketBase().catch((error) => {
            console.warn('No se pudo duplicar la confirmaci\u00f3n en PocketBase:', error);
        });

        window.setTimeout(() => {
            localStorage.setItem(confirmationStorageKey, 'true');
            showFormMessage('success', 'Confirmaci\u00f3n enviada con \u00e9xito. Muchas gracias por acompa\u00f1arnos en este d\u00eda tan especial.');
            trackInvitationEvent('confirmacion_enviada', {
                cupos: String(formSettings.cupos || 1),
                transporte: getTransportLabel(getFormValue('transporte'))
            });
            notifyTelegram('confirmacion_enviada', {
                confirmados: String(getConfirmedGuestCount()),
                cupos: String(formSettings.cupos || 1),
                transporte: getTransportLabel(getFormValue('transporte'))
            });
            lockConfirmationForm();
        }, 1600);
    });

function initPlaylist() {
    const playlistConfig = window.INVITACION_CONFIG?.playlist || {};
    const playlistForm = document.getElementById('playlistForm');
    const playlistMessage = document.getElementById('playlistMessage');
    const playlistSongs = document.getElementById('playlistSongs');
    const playlistGenreFilter = document.getElementById('playlistGenreFilter');
    const titleInput = playlistForm?.querySelector('input[name="titulo"]');
    const artistInput = playlistForm?.querySelector('input[name="artista"]');
    const suggestionsBox = document.getElementById('playlistSuggestions');
    const songLightbox = document.getElementById('songLightbox');
    const songLightboxCover = document.getElementById('songLightboxCover');
    const songLightboxTitle = document.getElementById('songLightboxTitle');
    const songLightboxArtist = document.getElementById('songLightboxArtist');
    const songLightboxGenre = document.getElementById('songLightboxGenre');
    const songLightboxVotes = document.getElementById('songLightboxVotes');
    const songLightboxPeople = document.getElementById('songLightboxPeople');
    const songLightboxClose = songLightbox?.querySelector('.song-lightbox-close');
    const collection = playlistConfig.coleccion || 'canciones';
    const endpoint = (playlistConfig.endpoint || 'https://www.pocketstiven.com').replace(/\/$/, '');
    const formInfo = window.INVITACION_CONFIG?.formulario || {};
    const invitedName = Array.isArray(formInfo.invitados) ? (formInfo.invitados[0] || '') : '';
    let playlistCache = [];
    let externalSuggestions = [];
    let suggestionsTimer = null;
    let suggestionsController = null;
    let selectedSuggestionValue = '';
    const artworkCache = new Map();
    let groupedPlaylistSongs = [];
    let activeGenreFilter = 'Todas';

    if (!playlistForm || !playlistMessage || !playlistSongs || !titleInput || !suggestionsBox || !playlistGenreFilter) return;

    const showPlaylistMessage = (type, message) => {
        playlistMessage.className = `playlist-message ${type}`;
        playlistMessage.textContent = message;
    };

    const recordsUrl = () => `${endpoint}/api/collections/${collection}/records`;
    const listRecordsUrl = (page = 1, perPage = 200) => `${recordsUrl()}?page=${page}&perPage=${perPage}`;

    const groupSongsByVotes = (songs) => {
        const groups = new Map();

        songs.forEach((song) => {
            const key = normalizeSongKey(song);
            if (!key.replace('|', '').trim()) return;

            if (!groups.has(key)) {
                groups.set(key, {
                    ...song,
                    genero: song.genero || 'Otro',
                    votos: 0,
                    ultimoVoto: song.created || '',
                    recomendadores: []
                });
            }

            const group = groups.get(key);
            group.votos += 1;
            if (song.invitado && !group.recomendadores.includes(song.invitado)) {
                group.recomendadores.push(song.invitado);
            }
            if (String(song.created || '') > String(group.ultimoVoto || '')) {
                group.ultimoVoto = song.created || '';
            }
            if (!group.artworkUrl && song.artworkUrl) group.artworkUrl = song.artworkUrl;
            if ((!group.genero || group.genero === 'Otro') && song.genero) group.genero = song.genero;
        });

        return [...groups.values()].sort((a, b) => {
            if (b.votos !== a.votos) return b.votos - a.votos;
            return String(b.ultimoVoto || '').localeCompare(String(a.ultimoVoto || ''));
        });
    };

    const hideSuggestions = () => {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
    };

    const normalizeSongKey = (song) => `${String(song.titulo || '').toLowerCase()}|${String(song.artista || '').toLowerCase()}`;

    const searchExternalSongs = async (query) => {
        if (suggestionsController) suggestionsController.abort();
        suggestionsController = new AbortController();

        const url = `https://itunes.apple.com/search?${new URLSearchParams({
            term: query,
            entity: 'song',
            limit: '6'
        }).toString()}`;

        const response = await fetch(url, { signal: suggestionsController.signal });
        if (!response.ok) return [];
        const data = await response.json();

        return (data.results || []).map((item) => ({
            titulo: item.trackName || '',
            artista: item.artistName || '',
            artworkUrl: item.artworkUrl100 || ''
        })).filter((song) => song.titulo);
    };

    const findArtwork = async (song) => {
        const key = normalizeSongKey(song);
        if (artworkCache.has(key)) return artworkCache.get(key);
        if (song.artworkUrl) {
            artworkCache.set(key, song.artworkUrl);
            return song.artworkUrl;
        }

        const query = [song.titulo, song.artista].filter(Boolean).join(' ');
        if (!query.trim()) return '';

        try {
            const url = `https://itunes.apple.com/search?${new URLSearchParams({
                term: query,
                entity: 'song',
                limit: '1'
            }).toString()}`;
            const response = await fetch(url);
            if (!response.ok) return '';
            const data = await response.json();
            const artwork = data.results?.[0]?.artworkUrl100 || '';
            artworkCache.set(key, artwork);
            return artwork;
        } catch (error) {
            artworkCache.set(key, '');
            return '';
        }
    };

    const showSuggestions = (query) => {
        const normalizedQuery = query.trim().toLowerCase();
        suggestionsBox.innerHTML = '';

        if (normalizedQuery.length < 2 || query.trim() === selectedSuggestionValue) {
            hideSuggestions();
            return;
        }

        const seen = new Set();
        const localMatches = playlistCache
            .filter((song) => {
                const title = String(song.titulo || '').toLowerCase();
                const artist = String(song.artista || '').toLowerCase();
                return title.includes(normalizedQuery) || artist.includes(normalizedQuery);
            });

        const matches = [...localMatches, ...externalSuggestions]
            .filter((song) => {
                const key = normalizeSongKey(song);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 5);

        if (!matches.length) {
            hideSuggestions();
            return;
        }

        matches.forEach((song) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'playlist-suggestion';
            button.textContent = song.titulo || 'Canci\u00f3n sugerida';

            if (song.artista) {
                const artist = document.createElement('span');
                artist.textContent = song.artista;
                button.appendChild(artist);
            }

            button.addEventListener('click', () => {
                titleInput.value = song.titulo || '';
                if (artistInput) artistInput.value = song.artista || '';
                selectedSuggestionValue = titleInput.value.trim();
                hideSuggestions();
                if (artistInput) artistInput.focus();
            });

            suggestionsBox.appendChild(button);
        });

        suggestionsBox.classList.remove('hidden');
    };

    const updateSuggestions = (query) => {
        window.clearTimeout(suggestionsTimer);
        if (query.trim() !== selectedSuggestionValue) selectedSuggestionValue = '';
        showSuggestions(query);

        if (query.trim().length < 3) return;

        suggestionsTimer = window.setTimeout(async () => {
            try {
                externalSuggestions = await searchExternalSongs(query.trim());
                if (titleInput.value.trim() === query.trim()) showSuggestions(query);
            } catch (error) {
                if (error.name !== 'AbortError') console.warn('No se pudieron cargar sugerencias externas:', error);
            }
        }, 320);
    };

    const closeSongLightbox = () => {
        if (!songLightbox) return;
        songLightbox.classList.remove('active');
        songLightbox.setAttribute('aria-hidden', 'true');
    };

    const openSongLightbox = async (song) => {
        if (!songLightbox) return;

        const artwork = await findArtwork(song);
        songLightboxTitle.textContent = song.titulo || 'Canción sugerida';
        songLightboxArtist.textContent = song.artista || 'Versión por confirmar';
        songLightboxGenre.textContent = song.genero || 'Otro';
        songLightboxVotes.textContent = `${song.votos || 1} ${(song.votos || 1) === 1 ? 'voto' : 'votos'}`;
        songLightboxPeople.innerHTML = '';

        const people = Array.isArray(song.recomendadores) && song.recomendadores.length
            ? song.recomendadores
            : ['Invitado especial'];

        people.forEach((person) => {
            const badge = document.createElement('span');
            badge.textContent = person;
            songLightboxPeople.appendChild(badge);
        });

        songLightboxCover.innerHTML = artwork
            ? `<img src="${artwork.replace('100x100bb', '300x300bb')}" alt="">`
            : '<i data-lucide="music-2" class="w-10 h-10"></i>';

        songLightbox.classList.add('active');
        songLightbox.setAttribute('aria-hidden', 'false');
        refreshLucideIcons();
    };

    const renderSongs = (songs) => {
        playlistSongs.innerHTML = '';

        if (!songs.length) {
            const empty = document.createElement('div');
            empty.className = 'playlist-message muted';
            empty.textContent = 'Todav\u00eda no hay canciones en la playlist.';
            playlistSongs.appendChild(empty);
            return;
        }

        songs.forEach((song, index) => {
            const item = document.createElement('article');
            item.className = 'playlist-song';
            item.tabIndex = 0;
            item.role = 'button';
            item.setAttribute('aria-label', `Ver detalles de ${song.titulo || 'canción sugerida'}`);

            const rank = document.createElement('div');
            rank.className = 'playlist-song-rank';
            rank.textContent = String(index + 1).padStart(2, '0');
            item.appendChild(rank);

            const cover = document.createElement('div');
            cover.className = 'playlist-song-cover';
            cover.innerHTML = '<i data-lucide="music-2" class="w-4 h-4"></i>';
            item.appendChild(cover);

            const info = document.createElement('div');
            info.className = 'playlist-song-info';
            item.appendChild(info);

            const title = document.createElement('strong');
            title.textContent = song.titulo || 'Canci\u00f3n sugerida';
            info.appendChild(title);

            if (song.artista) {
                const artist = document.createElement('span');
                artist.textContent = song.artista;
                info.appendChild(artist);
            }

            if (song.genero) {
                const genre = document.createElement('span');
                genre.className = 'playlist-song-genre';
                genre.textContent = song.genero;
                info.appendChild(genre);
            }

            const votes = document.createElement('small');
            votes.className = 'playlist-song-votes';
            votes.textContent = `${song.votos || 1} ${(song.votos || 1) === 1 ? 'voto' : 'votos'}`;
            item.appendChild(votes);

            item.addEventListener('click', () => openSongLightbox(song));
            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSongLightbox(song);
                }
            });

            playlistSongs.appendChild(item);

            findArtwork(song).then((artwork) => {
                if (!artwork) return;
                cover.innerHTML = '';
                const image = document.createElement('img');
                image.src = artwork.replace('100x100bb', '160x160bb');
                image.alt = '';
                image.loading = 'lazy';
                cover.appendChild(image);
            });
        });

        refreshLucideIcons();
    };

    const renderGenreFilters = () => {
        const genres = ['Todas', ...new Set(groupedPlaylistSongs.map((song) => song.genero || 'Otro'))];
        playlistGenreFilter.innerHTML = '';

        genres.forEach((genre) => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            playlistGenreFilter.appendChild(option);
        });
        playlistGenreFilter.value = genres.includes(activeGenreFilter) ? activeGenreFilter : 'Todas';
    };

    playlistGenreFilter.addEventListener('change', () => {
        activeGenreFilter = playlistGenreFilter.value || 'Todas';
        const visibleSongs = activeGenreFilter === 'Todas'
            ? groupedPlaylistSongs
            : groupedPlaylistSongs.filter((song) => (song.genero || 'Otro') === activeGenreFilter);
        renderSongs(visibleSongs);
    });

    const fetchAllSongs = async () => {
        const perPage = 200;
        let page = 1;
        let totalPages = 1;
        const items = [];

        do {
            const response = await fetch(listRecordsUrl(page, perPage));
            if (!response.ok) {
                let detail = '';
                try {
                    const errorData = await response.json();
                    const dataDetail = errorData.data && Object.keys(errorData.data).length ? JSON.stringify(errorData.data) : '';
                    detail = `${errorData.message || ''} ${dataDetail}`.trim();
                } catch (jsonError) {
                    detail = await response.text();
                }
                throw new Error(`PocketBase ${response.status}: ${detail || 'No se pudo cargar la playlist.'}`);
            }

            const data = await response.json();
            items.push(...(data.items || []));
            totalPages = Number(data.totalPages || 1);
            page += 1;
        } while (page <= totalPages);

        return items.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    };

    const loadSongs = async () => {
        if (!endpoint) return;

        try {
            const songs = await fetchAllSongs();
            groupedPlaylistSongs = groupSongsByVotes(songs
                .filter((song) => playlistConfig.mostrarSoloAprobadas === true ? song.aprobada === true : true)
            );
            if (activeGenreFilter !== 'Todas' && !groupedPlaylistSongs.some((song) => (song.genero || 'Otro') === activeGenreFilter)) {
                activeGenreFilter = 'Todas';
            }
            playlistCache = songs;
            renderGenreFilters();
            const visibleSongs = activeGenreFilter === 'Todas'
                ? groupedPlaylistSongs
                : groupedPlaylistSongs.filter((song) => (song.genero || 'Otro') === activeGenreFilter);
            renderSongs(visibleSongs);
        } catch (error) {
            console.error('Error cargando playlist:', error);
            showPlaylistMessage('muted', `La playlist no pudo cargarse. ${error.message || 'Revisa la regla List/Search en PocketBase.'}`);
        }
    };

    playlistForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!endpoint) {
            showPlaylistMessage('error', 'A\u00fan no hay un servidor de canciones configurado.');
            return;
        }

        const button = playlistForm.querySelector('button[type="submit"]');
        const formData = new FormData(playlistForm);
        const payload = {
            titulo: (formData.get('titulo') || '').toString().trim(),
            artista: (formData.get('artista') || '').toString().trim(),
            genero: (formData.get('genero') || 'Otro').toString(),
            invitado: invitedName,
            idConfirmacion: formInfo.idConfirmacion || '',
            aprobada: true
        };

        if (!payload.titulo) {
            showPlaylistMessage('error', 'Escribe el nombre de la canci\u00f3n para poder enviarla.');
            return;
        }

        try {
            if (button) {
                button.disabled = true;
                button.innerHTML = 'Enviando canci\u00f3n...';
            }

            const response = await fetch(recordsUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let detail = '';
                try {
                    const errorData = await response.json();
                    detail = errorData.message || JSON.stringify(errorData.data || errorData);
                } catch (jsonError) {
                    detail = await response.text();
                }
                throw new Error(`PocketBase ${response.status}: ${detail || 'No se pudo guardar la canci\u00f3n.'}`);
            }

            playlistForm.reset();
            hideSuggestions();
            showPlaylistMessage('success', 'Canci\u00f3n enviada. Ya hace parte de la playlist.');
            trackInvitationEvent('cancion_enviada', {
                titulo: payload.titulo,
                artista: payload.artista,
                genero: payload.genero
            });
            notifyTelegram('cancion_enviada', {
                titulo: payload.titulo,
                artista: payload.artista,
                genero: payload.genero
            });
            await loadSongs();
        } catch (error) {
            console.error('Error enviando canci\u00f3n:', error);
            showPlaylistMessage('error', `No pudimos guardar la canci\u00f3n. ${error.message || 'Revisa que PocketBase est\u00e9 encendido.'}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Enviar canci\u00f3n';
                refreshLucideIcons();
            }
        }
    });

    titleInput.addEventListener('input', () => updateSuggestions(titleInput.value));
    titleInput.addEventListener('focus', () => updateSuggestions(titleInput.value));
    titleInput.addEventListener('blur', () => {
        window.setTimeout(() => {
            if (!suggestionsBox.contains(document.activeElement)) hideSuggestions();
        }, 120);
    });
    artistInput?.addEventListener('focus', hideSuggestions);
    playlistForm.querySelector('select[name="genero"]')?.addEventListener('focus', hideSuggestions);
    songLightboxClose?.addEventListener('click', closeSongLightbox);
    songLightbox?.addEventListener('click', (event) => {
        if (event.target === songLightbox) closeSongLightbox();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && songLightbox?.classList.contains('active')) closeSongLightbox();
    });
    document.addEventListener('click', (event) => {
        if (!playlistForm.contains(event.target)) hideSuggestions();
    });

    loadSongs();
}

initPlaylist();

function initMemories() {
    const endpoint = 'https://www.pocketstiven.com';
    const collection = 'recuerdos';
    const form = document.getElementById('memoriesForm');
    const message = document.getElementById('memoriesMessage');
    const gallery = document.getElementById('memoriesGallery');
    const loadMoreButton = document.getElementById('loadMoreMemories');
    const fileInput = form?.querySelector('input[type="file"]');
    const fileLabel = form?.querySelector('.memories-file span');
    const lightbox = document.getElementById('memoryLightbox');
    const lightboxImg = document.getElementById('memoryLightboxImg');
    const downloadButton = document.getElementById('memoryDownload');
    const closeButton = lightbox?.querySelector('.memory-close');
    const prevButton = lightbox?.querySelector('.memory-prev');
    const nextButton = lightbox?.querySelector('.memory-next');
    const formInfo = window.INVITACION_CONFIG?.formulario || {};
    const invitedName = Array.isArray(formInfo.invitados) ? (formInfo.invitados[0] || '') : '';
    let memoryPhotos = [];
    let activeMemoryIndex = 0;
    let touchStartX = 0;
    let allMemoryRecords = [];
    let visibleMemoryCount = 10;
    const memoryBatchSize = 10;

    if (!form || !message || !gallery || !fileInput || !loadMoreButton) return;

    const recordsUrl = () => `${endpoint}/api/collections/${collection}/records`;
    const fileUrl = (record, fileName) => `${endpoint}/api/files/${collection}/${record.id}/${fileName}`;

    const showMessage = (type, text) => {
        message.className = `memories-message ${type}`;
        message.textContent = text;
    };

    const isHeicFile = (file) => /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);

    const normalizePhotoFile = async (file) => {
        if (!isHeicFile(file)) return file;

        if (!window.heic2any) {
            throw new Error(`${file.name}: el navegador no pudo convertir esta foto HEIC.`);
        }

        const converted = await window.heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9
        });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        return new File([blob], name, { type: 'image/jpeg' });
    };

    const openMemory = (index) => {
        if (!lightbox || !lightboxImg || !downloadButton || !memoryPhotos.length) return;
        activeMemoryIndex = (index + memoryPhotos.length) % memoryPhotos.length;
        const photo = memoryPhotos[activeMemoryIndex];
        lightboxImg.src = photo.url;
        lightboxImg.alt = photo.alt;
        downloadButton.href = photo.url;
        downloadButton.download = photo.fileName;
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        refreshLucideIcons();
    };

    const downloadMemoryPhoto = async (event) => {
        event.preventDefault();
        if (!memoryPhotos.length) return;

        const photo = memoryPhotos[activeMemoryIndex];
        const originalText = downloadButton.innerHTML;

        try {
            downloadButton.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4"></i> Descargando';
            refreshLucideIcons();

            const response = await fetch(photo.url);
            if (!response.ok) throw new Error('No se pudo descargar la foto.');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = photo.fileName || 'foto-celebracion.jpg';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            window.open(photo.url, '_blank', 'noopener');
        } finally {
            downloadButton.innerHTML = originalText;
            refreshLucideIcons();
        }
    };

    const closeMemory = () => {
        if (!lightbox || !lightboxImg) return;
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        lightboxImg.src = '';
        document.body.style.overflow = '';
    };

    const showMemoryOffset = (offset) => openMemory(activeMemoryIndex + offset);

    const renderGallery = (records) => {
        gallery.innerHTML = '';

        if (!records.length) {
            const empty = document.createElement('div');
            empty.className = 'memories-message muted';
            empty.textContent = 'A\u00fan no hay fotos compartidas.';
            gallery.appendChild(empty);
            return;
        }

        memoryPhotos = records.map((record) => {
            const fileName = Array.isArray(record.foto) ? record.foto[0] : record.foto;
            if (!fileName) return null;

            const url = fileUrl(record, fileName);
            return {
                url,
                fileName,
                alt: record.nombre ? `Foto subida por ${record.nombre}` : 'Foto de la celebraci\u00f3n'
            };
        }).filter(Boolean);

        memoryPhotos.forEach((photo, index) => {
            const item = document.createElement('article');
            item.className = 'memory-photo';

            const image = document.createElement('img');
            image.src = `${photo.url}?thumb=240x240`;
            image.alt = photo.alt;
            image.loading = 'lazy';
            item.appendChild(image);

            item.addEventListener('click', () => openMemory(index));

            gallery.appendChild(item);
        });

        refreshLucideIcons();
        loadMoreButton.classList.toggle('hidden', visibleMemoryCount >= allMemoryRecords.length);
    };

    const loadMemories = async () => {
        try {
            const response = await fetch(recordsUrl());
            if (!response.ok) throw new Error(`PocketBase ${response.status}`);
            const data = await response.json();
            allMemoryRecords = (data.items || [])
                .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
            visibleMemoryCount = Math.min(visibleMemoryCount, Math.max(allMemoryRecords.length, memoryBatchSize));
            renderGallery(allMemoryRecords.slice(0, visibleMemoryCount));
        } catch (error) {
            showMessage('muted', 'La galer\u00eda estar\u00e1 disponible cuando el servidor de recuerdos est\u00e9 activo.');
        }
    };

    loadMoreButton.addEventListener('click', () => {
        visibleMemoryCount += memoryBatchSize;
        renderGallery(allMemoryRecords.slice(0, visibleMemoryCount));
    });

    fileInput.addEventListener('change', () => {
        const files = [...(fileInput.files || [])];
        if (!fileLabel) return;
        if (!files.length) {
            fileLabel.textContent = 'Seleccionar fotos';
        } else if (files.length === 1) {
            fileLabel.textContent = files[0].name;
        } else {
            fileLabel.textContent = `${files.length} fotos seleccionadas`;
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const files = [...(fileInput.files || [])];
        if (!files.length) {
            showMessage('error', 'Selecciona una o varias fotos para subirlas.');
            return;
        }

        const button = form.querySelector('button[type="submit"]');

        try {
            if (button) {
                button.disabled = true;
                button.innerHTML = files.length === 1 ? 'Subiendo recuerdo...' : `Subiendo 1 de ${files.length}...`;
            }

            for (let index = 0; index < files.length; index++) {
                if (button) button.innerHTML = files.length === 1 ? 'Subiendo recuerdo...' : `Subiendo ${index + 1} de ${files.length}...`;

                const uploadFile = await normalizePhotoFile(files[index]);
                const data = new FormData();
                data.set('nombre', invitedName);
                data.set('idConfirmacion', formInfo.idConfirmacion || '');
                data.set('foto', uploadFile);

                const response = await fetch(recordsUrl(), {
                    method: 'POST',
                    body: data
                });

                if (!response.ok) {
                    let detail = '';
                    try {
                        const errorData = await response.json();
                        const fieldErrors = errorData.data
                            ? Object.entries(errorData.data)
                                .map(([field, info]) => `${field}: ${info.message || JSON.stringify(info)}`)
                                .join(' ')
                            : '';
                        detail = [errorData.message, fieldErrors].filter(Boolean).join(' ');
                    } catch (jsonError) {
                        detail = await response.text();
                    }
                    throw new Error(`${uploadFile.name}: ${detail || 'No se pudo subir la foto.'}`);
                }
            }

            form.reset();
            if (fileLabel) fileLabel.textContent = 'Seleccionar fotos';
            showMessage('success', files.length === 1 ? 'Foto subida con \u00e9xito. Gracias por dejarnos este recuerdo.' : `${files.length} fotos subidas con \u00e9xito. Gracias por dejarnos estos recuerdos.`);
            trackInvitationEvent('recuerdos_subidos', {
                cantidad: String(files.length)
            });
            notifyTelegram('recuerdos_subidos', {
                cantidad: String(files.length)
            });
            await loadMemories();
        } catch (error) {
            showMessage('error', `No pudimos subir la foto. ${error.message || 'Revisa PocketBase.'}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Subir recuerdo';
                refreshLucideIcons();
            }
        }
    });

    closeButton?.addEventListener('click', closeMemory);
    downloadButton?.addEventListener('click', downloadMemoryPhoto);
    prevButton?.addEventListener('click', () => showMemoryOffset(-1));
    nextButton?.addEventListener('click', () => showMemoryOffset(1));
    lightbox?.addEventListener('click', (event) => {
        if (event.target === lightbox) closeMemory();
    });
    lightbox?.addEventListener('touchstart', (event) => {
        touchStartX = event.touches[0]?.clientX || 0;
    }, { passive: true });
    lightbox?.addEventListener('touchend', (event) => {
        const touchEndX = event.changedTouches[0]?.clientX || 0;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 45) showMemoryOffset(diff > 0 ? -1 : 1);
    }, { passive: true });
    document.addEventListener('keydown', (event) => {
        if (!lightbox?.classList.contains('active')) return;
        if (event.key === 'Escape') closeMemory();
        if (event.key === 'ArrowLeft') showMemoryOffset(-1);
        if (event.key === 'ArrowRight') showMemoryOffset(1);
    });

    loadMemories();
}

initMemories();

function toggleExtraName() {
        const select = document.getElementById('cantidadSelect');
        const extraField = document.getElementById('extraNameField');
        
        if (select.value === '2') {
            extraField.classList.remove('hidden'); // Muestra el campo
        } else {
            extraField.classList.add('hidden'); // Lo oculta
        }
    }

const video = document.getElementById('storyVideo');
    const indicator = document.getElementById('pauseIndicator');

    // Función para manejar pausa y play
    const toggleVideo = (shouldPause) => {
        if (shouldPause) {
            video.pause();
            indicator.classList.remove('opacity-0');
        } else {
            video.play();
            indicator.classList.add('opacity-0');
        }
    };

    // Eventos táctiles y de ratón
    video.addEventListener('touchstart', () => toggleVideo(true), {passive: true});
    video.addEventListener('touchend', () => toggleVideo(false));
    video.addEventListener('mousedown', () => toggleVideo(true));
    video.addEventListener('mouseup', () => toggleVideo(false));
    video.addEventListener('mouseleave', () => toggleVideo(false));

const videoElement = document.getElementById('storyVideo');
    const pauseIcon = document.getElementById('pauseIndicator');

    // Función para pausar y mostrar icono
    const holdToPause = () => {
        videoElement.pause();
        pauseIcon.classList.remove('opacity-0');
    };

    // Función para reproducir y ocultar icono
    const releaseToPlay = () => {
        videoElement.play();
        pauseIcon.classList.add('opacity-0');
    };

    // Eventos para móviles (Pantalla táctil)
    videoElement.addEventListener('touchstart', holdToPause, {passive: true});
    videoElement.addEventListener('touchend', releaseToPlay);
    videoElement.addEventListener('touchcancel', releaseToPlay);

    // Eventos para PC (Ratón)
    videoElement.addEventListener('mousedown', holdToPause);
    videoElement.addEventListener('mouseup', releaseToPlay);
    videoElement.addEventListener('mouseleave', releaseToPlay); // Por si arrastran el ratón fuera

refreshLucideIcons();

        const slides = document.querySelectorAll('.slide');
        const heroText = document.getElementById('hero-text');
        let currentSlide = 0;

        function updateCarousel() {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');

            if (currentSlide === 0) {
                heroText.classList.remove('hidden-anim');
                heroText.classList.add('visible');
            } else {
                heroText.classList.remove('visible');
                heroText.classList.add('hidden-anim');
            }
        }
        let carouselInterval;

        function updateCountdown() {
            const configuredDate = window.INVITACION_CONFIG?.evento?.fechaCuentaRegresiva || "2026-12-26T16:30:00";
            const targetDate = new Date(configuredDate).getTime();
            const now = new Date().getTime();
            const gap = targetDate - now;
            
            if (gap > 0) {
                document.getElementById('days').innerText = String(Math.floor(gap / (1000*60*60*24))).padStart(2, '0');
                document.getElementById('hours').innerText = String(Math.floor((gap % (1000*60*60*24)) / (1000*60*60))).padStart(2, '0');
                document.getElementById('minutes').innerText = String(Math.floor((gap % (1000*60*60)) / (1000*60))).padStart(2, '0');
                document.getElementById('seconds').innerText = String(Math.floor((gap % (1000*60)) / 1000)).padStart(2, '0');
            } else {
                 document.getElementById('days').innerText = "00";
                 document.getElementById('hours').innerText = "00";
                 document.getElementById('minutes').innerText = "00";
                 document.getElementById('seconds').innerText = "00";
            }
        }
        setInterval(updateCountdown, 1000);
        updateCountdown();

        window.addEventListener("scroll", () => {

    document.querySelectorAll(".reveal, .bible-card, .moment-card").forEach(el => {

        const rect = el.getBoundingClientRect();

        if (
            rect.top < window.innerHeight - 100 &&
            rect.bottom > 100
        ) {
            el.classList.add("active");
        } else {
            el.classList.remove("active");
        }

    });

});

        const whatsappBtn = document.getElementById('whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.href = 'https://wa.me/573001234567?text=Hola%20Stiven%20y%20Nicole%21%20Confirmo%20mi%20asistencia.';
        }
    function openInvitation(){

    trackInvitationEvent('invitacion_abierta');

    const music = document.getElementById('bgMusic');

    if (music) { music.play(); }

    const img = document.getElementById('envelopeImage');

    if (img) {
        img.classList.add('is-opening');
    }

    setTimeout(() => {

        document.getElementById('envelopeScreen').style.display = 'none';

        document.getElementById('invitationContent').style.display = 'block';

        // Reiniciar carrusel
        currentSlide = 0;

        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        slides[0].classList.add('active');

        heroText.classList.add('visible');

        carouselInterval = setInterval(updateCarousel, 4000);

        window.scrollTo({
            top: 0,
            behavior: 'instant'
        });

    }, 700);
}
    
   const bibleCards = document.querySelectorAll('.bible-card');

window.addEventListener("scroll", () => {

    bibleCards.forEach(card => {

        if(card.getBoundingClientRect().top < window.innerHeight - 100){

            card.classList.add("active");

        }

    });

});

function applyInvitationConfig(){
    const config = window.INVITACION_CONFIG || {};
    const pareja = config.pareja || {};
    const evento = config.evento || {};
    const textos = config.textos || {};
    const multimedia = config.multimedia || {};
    const formularioConfig = config.formulario || {};
    const promesa = config.promesa || {};
    const playlistTextos = config.playlist || {};
    const recuerdosTextos = config.recuerdos || {};

    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value !== undefined) element.textContent = value;
    };
    const setHtml = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value !== undefined) element.innerHTML = value;
    };
    const setSrc = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value) element.src = value;
    };
    const eventDate = new Date(evento.fechaCuentaRegresiva || '2026-12-26T16:00:00');
    const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthNamesLower = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const weekdayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MI\u00c9RCOLES', 'JUEVES', 'VIERNES', 'S\u00c1BADO'];
    const eventYear = eventDate.getFullYear();
    const eventMonth = eventDate.getMonth() + 1;
    const eventDay = eventDate.getDate();
    const eventMonthName = monthNames[eventMonth - 1];
    const eventHour = eventDate.toLocaleTimeString('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(/\s/g, ' ').toUpperCase();
    const eventDisplayDate = `${eventDay} ${monthNamesLower[eventMonth - 1]} ${eventYear}`;
    const renderCalendar = () => {
        const calendar = document.getElementById('saveDateCalendar');
        if (!calendar) return;

        const year = eventYear;
        const month = eventMonth;
        const markedDay = eventDay;
        const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        const firstDay = new Date(year, month - 1, 1);
        const daysInMonth = new Date(year, month, 0).getDate();
        const mondayBasedStart = (firstDay.getDay() + 6) % 7;

        calendar.innerHTML = '';
        weekdays.forEach((label) => {
            const dayName = document.createElement('span');
            dayName.textContent = label;
            calendar.appendChild(dayName);
        });

        for (let i = 0; i < mondayBasedStart; i++) {
            calendar.appendChild(document.createElement('span'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('span');
            if (day === markedDay) {
                dayElement.innerHTML = '&hearts;';
                dayElement.className = 'font-bold text-red-500 text-lg leading-none animate-heart relative';
                dayElement.setAttribute('aria-label', `Día marcado ${day}`);
            } else {
                dayElement.textContent = String(day);
            }
            calendar.appendChild(dayElement);
        }
    };
    const renderGuestInputs = () => {
        const container = document.getElementById('guestInputs');
        if (!container) return;

        const guests = Array.isArray(formularioConfig.invitados) ? formularioConfig.invitados : [];
        const slots = Math.max(Number(formularioConfig.cupos || guests.length || 1), 1);

        container.innerHTML = '';

        for (let index = 0; index < slots; index++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = index === 0 ? 'nombre_principal' : `nombre_acompanante_${index}`;
            input.value = guests[index] || '';
            input.placeholder = index === 0 ? 'Nombre principal' : `Nombre del acompañante ${index}`;
            input.required = index === 0;
            input.className = 'w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-olive-600 text-sm';
            container.appendChild(input);
        }
    };

    if (pareja.tituloPagina) document.title = pareja.tituloPagina;

    if (multimedia.fondoFlores) {
        document.documentElement.style.setProperty('--fondo-flores', `url("${multimedia.fondoFlores}")`);
    }
    if (multimedia.marcoFloral) {
        document.documentElement.style.setProperty('--marco-floral', `url("${multimedia.marcoFloral}")`);
    }
    if (multimedia.sobre) {
        document.querySelectorAll('.envelope-half img').forEach((img) => {
            img.src = multimedia.sobre;
        });
    }

    if (multimedia.musica) {
        const musicSource = document.querySelector('#bgMusic source');
        if (musicSource) {
            musicSource.src = multimedia.musica;
            const music = document.getElementById('bgMusic');
            if (music) music.load();
        }
    }

    const heroTitle = document.querySelector('#hero-text h1');
    if (heroTitle && pareja.nombre1 && pareja.nombre2) {
        heroTitle.innerHTML = textos.heroTitulo
            ? `${textos.heroTitulo}<span class="hero-subtitle block font-sans text-[0.62rem] uppercase tracking-[0.34em] mt-4 text-white/90">${eventDisplayDate}</span>`
            : `${pareja.nombre1} <br> <span class="text-5xl">&</span> <br> ${pareja.nombre2}<span class="hero-subtitle block font-sans text-[0.62rem] uppercase tracking-[0.34em] mt-4 text-white/90">${eventDisplayDate}</span>`;
    }

    (multimedia.carrusel || []).forEach((src, index) => {
        const slide = document.querySelectorAll('#carousel .slide')[index];
        if (slide) slide.src = src;
    });

    setText('.bible-card h3', promesa.titulo);
    if (promesa.versiculo) {
        const verse = document.querySelector('.bible-card-content p.italic');
        if (verse) verse.textContent = `"${promesa.versiculo}"`;
    }
    setText('.bible-card-content .mt-6', promesa.cita);
    setText('#promiseMessage', promesa.mensaje);
    setText('#promiseDetail', promesa.mensajeDetalle);

    setText('.px-6.py-10 h2', textos.tituloPrincipal);
    setText('.px-6.py-10 h3', textos.saveTheDate);
    setText('.px-6.py-10 > p', `${eventMonthName} ${eventYear}`);
    renderCalendar();
    setText('.px-6.py-12.border-t h3', textos.celebra);
    setText('textPath', eventMonthName);
    setText('.text-\\[4\\.5rem\\]', String(eventDay));
    const eventPills = document.querySelectorAll('.zoom-seq');
    if (eventPills[0]) eventPills[0].textContent = weekdayNames[eventDate.getDay()];
    if (eventPills[2]) eventPills[2].textContent = eventHour.replace('A. M.', 'A.M.').replace('P. M.', 'P.M.');
    setSrc('.blurred-edges', multimedia.ilustracionPareja);

    const ceremonyTexts = document.querySelectorAll('.mb-8.text-gray-600 > p');
    if (ceremonyTexts[0] && textos.ceremonia) ceremonyTexts[0].textContent = textos.ceremonia;
    if (ceremonyTexts[1] && textos.recepcion) ceremonyTexts[1].textContent = textos.recepcion;
    setText('.mb-8.text-gray-600 .text-lg', evento.lugar);
    const mapLink = document.querySelector('a[href*="maps"]');
    if (mapLink && evento.mapaUrl) mapLink.href = evento.mapaUrl;
    const parking = document.querySelector('.px-6.py-12.border-t > p:last-child');
    if (parking && evento.estacionamiento) parking.textContent = evento.estacionamiento;

    setText('.moments-heading h3', textos.momentosTitulo);
    (multimedia.momentos || []).forEach((src, index) => {
        const photo = document.querySelectorAll('.moment-card img')[index];
        if (photo) photo.src = src;
    });

    setText('h3.font-script.text-5xl.text-olive-800.mb-8', textos.vestimentaTitulo);
    setSrc('img[alt="Icono Vestimenta"]', multimedia.iconoVestimenta);
    setText('.max-w-sm .font-bold.text-gray-800', textos.vestimentaTipo);
    const dressLines = document.querySelectorAll('.max-w-sm .text-gray-600.font-medium span');
    if (dressLines[0] && textos.vestimentaMujeres) dressLines[0].textContent = textos.vestimentaMujeres;
    if (dressLines[1] && textos.vestimentaHombres) dressLines[1].textContent = textos.vestimentaHombres;
    const dressNote = document.querySelector('.max-w-sm .text-xs.text-gray-400.italic');
    if (dressNote && textos.vestimentaNota) dressNote.textContent = textos.vestimentaNota;
    const dressSwatches = document.getElementById('dressColorSwatches');
    if (dressSwatches) {
        const colors = Array.isArray(textos.vestimentaColores) ? textos.vestimentaColores : [];
        dressSwatches.innerHTML = '';
        colors.forEach((item, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'w-10 h-10 rounded-full shadow-lg animate-zoom';
            swatch.title = item.nombre || item.color || 'Color';
            swatch.style.backgroundColor = item.color || '#ffffff';
            swatch.style.border = `4px solid ${item.borde || item.color || '#ffffff'}`;
            swatch.style.animationDelay = `${index * 0.45}s`;
            dressSwatches.appendChild(swatch);
        });
    }

    const noteSections = [...document.querySelectorAll('.px-6.py-12.text-center.relative.z-10.reveal')];
    const adultSection = noteSections.find((section) => section.textContent.includes('solo para adultos'));
    if (adultSection) {
        const title = adultSection.querySelector('h3');
        const paragraph = adultSection.querySelector('p');
        if (title && textos.notaTitulo) title.textContent = textos.notaTitulo;
        if (paragraph && textos.notaAdultos) paragraph.textContent = textos.notaAdultos;
    }

    const videoSource = document.querySelector('#storyVideo source');
    if (videoSource && multimedia.videoAnillos) {
        videoSource.src = multimedia.videoAnillos;
        document.getElementById('storyVideo').load();
    }
    const videoSection = noteSections.find((section) => section.querySelector('#storyVideo'));
    if (videoSection) {
        setText.call(null, '#storyVideo', undefined);
        const title = videoSection.querySelector('h3');
        const subtitle = videoSection.querySelector('p.text-\\[0\\.7rem\\]');
        const hint = videoSection.querySelector('p.text-\\[0\\.65rem\\]');
        if (title && textos.videoTitulo) title.textContent = textos.videoTitulo;
        if (subtitle && textos.videoSubtitulo) subtitle.textContent = textos.videoSubtitulo;
        if (hint && textos.videoIndicacion) hint.textContent = textos.videoIndicacion;
    }

    const giftSection = noteSections.find((section) => section.textContent.includes('lluvia de sobres'));
    if (giftSection) {
        const title = giftSection.querySelector('h3');
        const paragraph = giftSection.querySelector('p');
        if (title && textos.regalosTitulo) title.textContent = textos.regalosTitulo;
        if (paragraph && textos.regalosTexto) paragraph.textContent = textos.regalosTexto;
    }

    const confirmationSection = noteSections.find((section) => section.querySelector('form'));
    if (confirmationSection) {
        const title = confirmationSection.querySelector('h3');
        const intro = confirmationSection.querySelector('p');
        if (title && textos.confirmacionTitulo) title.textContent = textos.confirmacionTitulo;
        if (intro && textos.confirmacionTexto) intro.textContent = textos.confirmacionTexto;
    }
    if (formularioConfig.endpoint && form) form.action = formularioConfig.endpoint;
    renderGuestInputs();

    setText('.glass-panel h5', textos.contadorTitulo);
    setText('.glass-panel > p', textos.contadorSubtitulo);
    setText('.scroll-reveal h6', textos.transporteTitulo);
    setHtml('.scroll-reveal p.text-gray-600', textos.transporteTexto);
    setText('.scroll-reveal .inline-block span', textos.transporteHora);
    const transportNote = document.querySelector('.scroll-reveal p.text-xs');
    if (transportNote && textos.transporteNota) transportNote.textContent = textos.transporteNota;

    const footer = document.querySelector('footer p');
    if (footer) {
        footer.innerHTML = `${textos.footer || 'creado con amor por'} <span class="text-olive-700 font-medium tracking-wider">${textos.footerNombre || ''}</span>`;
    }

    setText('.playlist-card h3', playlistTextos.titulo);
    setText('.playlist-kicker', playlistTextos.kicker);
    setText('.playlist-copy', playlistTextos.descripcion);
    setText('.memories-card h3', recuerdosTextos.titulo);
    setText('.memories-kicker', recuerdosTextos.kicker);
    setText('.memories-copy', recuerdosTextos.descripcion);

    const editableStyleTargets = [
        { selector: '#hero-text h1', path: 'textos.heroTitulo' },
        { selector: '.bible-card h3', path: 'promesa.titulo' },
        { selector: '.bible-card-content p.italic', path: 'promesa.versiculo' },
        { selector: '.bible-card-content .mt-6', path: 'promesa.cita' },
        { selector: '.px-6.py-10 h2', path: 'textos.tituloPrincipal' },
        { selector: '.px-6.py-10 h3', path: 'textos.saveTheDate' },
        { selector: '.px-6.py-10 > p', path: 'textos.fechaCalendario' },
        { selector: '.px-6.py-12.border-t h3', path: 'textos.celebra' },
        { selector: '.mb-8.text-gray-600 > p:nth-child(1)', path: 'textos.ceremonia' },
        { selector: '.mb-8.text-gray-600 > p:nth-child(2)', path: 'textos.recepcion' },
        { selector: '.mb-8.text-gray-600 .text-lg', path: 'evento.lugar' },
        { selector: '.moments-heading h3', path: 'textos.momentosTitulo' },
        { selector: 'h3.font-script.text-5xl.text-olive-800.mb-8', path: 'textos.vestimentaTitulo' },
        { selector: '.max-w-sm .font-bold.text-gray-800', path: 'textos.vestimentaTipo' },
        { selector: '.max-w-sm .text-xs.text-gray-400.italic', path: 'textos.vestimentaNota' },
        { selector: '.playlist-card h3', path: 'playlist.titulo' },
        { selector: '.playlist-kicker', path: 'playlist.kicker' },
        { selector: '.playlist-copy', path: 'playlist.descripcion' },
        { selector: '.memories-card h3', path: 'recuerdos.titulo' },
        { selector: '.memories-kicker', path: 'recuerdos.kicker' },
        { selector: '.memories-copy', path: 'recuerdos.descripcion' },
        { selector: '.gift-envelope-card .gift-copy', path: 'textos.regalosTexto' },
        { selector: '.glass-panel h5', path: 'textos.contadorTitulo' },
        { selector: '.scroll-reveal h6', path: 'textos.transporteTitulo' }
    ];

    editableStyleTargets.forEach(({ selector, path }) => {
        const style = config.estilos?.[path];
        if (!style) return;

        document.querySelectorAll(selector).forEach((element) => {
            Object.entries(style).forEach(([property, value]) => {
                if (value) element.style[property] = value;
            });
        });
    });

    const sectionTargets = [
        { selector: '.bible-card', id: 'promesa' },
        { selector: '.px-6.py-10.text-center', id: 'fecha' },
        { selector: '.moments-heading', id: 'momentosTitulo', groupSelector: '.moments-heading, .mosaic-container' },
        { selector: '.mosaic-container', id: 'momentosFotos' },
        { selector: '#playlistSection', id: 'playlist' },
        { selector: '#memoriesSection', id: 'recuerdos' }
    ];
    const sectionOrder = Array.isArray(config.seccionesOrden) ? config.seccionesOrden : [];
    const container = document.querySelector('#invitationContent .invitation-container');
    if (container && sectionOrder.length) {
        const sections = new Map(sectionTargets.map((section) => [section.id, section]));
        const footer = document.querySelector('footer');
        sectionOrder.forEach((id) => {
            const section = sections.get(id);
            if (!section) return;
            document.querySelectorAll(section.groupSelector || section.selector).forEach((element) => {
                container.insertBefore(element, footer || null);
            });
        });
    }
}

const loveTexts = (window.INVITACION_CONFIG && window.INVITACION_CONFIG.frasesMomentos) || [
"Contigo aprendí que el amor sí puede durar para siempre &#10084;&#65039;",
"Mi lugar favorito siempre será a tu lado &#10024;",
"Cada sonrisa tuya ilumina mi mundo &#129293;",
"Nuestro mejor viaje comenzó el día que nos conocimos &#128141;",
"Gracias por convertir días comunes en recuerdos inolvidables &#127801;",
"Eres mi paz en medio de cualquier tormenta &#128149;",
"Juntos escribimos la historia más bonita de nuestras vidas &#128214;",
"Elegirte fue la decisión más hermosa que he tomado &#128150;",
"Hoy, mañana y siempre, mi corazón será tu hogar &#10084;&#65039;"
];

function openPhoto(img,index){

    const lightbox = document.getElementById('photoLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const loveMessage = document.getElementById('loveMessage');

    if (lightbox.parentElement !== document.body) {
        document.body.appendChild(lightbox);
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    lightboxImg.classList.remove('is-flipping');
    loveMessage.classList.remove('is-visible');

    lightboxImg.src = img.src;
    loveMessage.innerHTML = loveTexts[index];
    loveMessage.dataset.signature = `${window.INVITACION_CONFIG?.pareja?.nombre1 || 'Stiven'} & ${window.INVITACION_CONFIG?.pareja?.nombre2 || 'Nicole'}`;

    requestAnimationFrame(() => {
        lightboxImg.classList.add('is-flipping');
        loveMessage.classList.add('is-visible');
    });

    createHearts();
}

function closePhoto(){
    document.getElementById('photoLightbox').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('lightboxImg').classList.remove('is-flipping');
    document.getElementById('loveMessage').classList.remove('is-visible');
}

function openPromise(){
    const lightbox = document.getElementById('promiseLightbox');
    if (!lightbox) return;
    if (lightbox.parentElement !== document.body) {
        document.body.appendChild(lightbox);
    }
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closePromise(){
    const lightbox = document.getElementById('promiseLightbox');
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
        closePhoto();
        closePromise();
    }
});

function createHearts(){

    const container =
        document.getElementById('heartsContainer');

    container.innerHTML = '';

    for(let i=0;i<20;i++){

        const heart =
            document.createElement('div');

        heart.classList.add('heart');

        heart.innerHTML = '&#10084;';

        heart.style.left =
            Math.random()*100 + '%';

        heart.style.animationDelay =
            Math.random()*3 + 's';

        heart.style.fontSize =
            (18 + Math.random()*20) + 'px';

        container.appendChild(heart);
    }
}

const modernMusic = document.getElementById('bgMusic');
        const modernMusicToggle = document.getElementById('musicToggle');
        const modernEnvelope = document.getElementById('envelopeScreen');
        const modernInvitation = document.getElementById('invitationContent');

        if (modernMusicToggle && modernMusicToggle.parentElement !== document.body) {
            document.body.appendChild(modernMusicToggle);
        }

        function refreshMusicIcon(isPlaying) {
            if (!modernMusicToggle) return;
            modernMusicToggle.innerHTML = isPlaying
                ? '<i data-lucide="volume-2" class="w-5 h-5"></i>'
                : '<i data-lucide="volume-x" class="w-5 h-5"></i>';
            refreshLucideIcons();
        }

        const modernRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.14, rootMargin: '0px 0px -70px 0px' });

        document.querySelectorAll('.reveal, .scroll-reveal, .bible-card, .moment-card').forEach((element, index) => {
            element.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
            modernRevealObserver.observe(element);
        });

        if (modernMusicToggle && modernMusic) {
            modernMusicToggle.addEventListener('click', () => {
                if (modernMusic.paused) {
                    modernMusic.play();
                    refreshMusicIcon(true);
                } else {
                    modernMusic.pause();
                    refreshMusicIcon(false);
                }
            });
        }

        const originalOpenInvitation = window.openInvitation;
        window.openInvitation = function () {
            if (modernEnvelope) modernEnvelope.classList.add('opening');

            if (modernMusic) {
                modernMusic.play()
                    .then(() => refreshMusicIcon(true))
                    .catch(() => refreshMusicIcon(false));
            }

            if (typeof originalOpenInvitation === 'function') {
                originalOpenInvitation();
            }

            setTimeout(() => {
                if (modernInvitation) modernInvitation.classList.add('invitation-enter');
                if (modernMusicToggle) modernMusicToggle.style.display = 'flex';
            }, 780);
        };

applyInvitationConfig();

document.getElementById('envelopeImage')?.addEventListener('click', openInvitation);

document.querySelector('.close-lightbox')?.addEventListener('click', closePhoto);

document.addEventListener('click', function(e){
    if (e.target.closest('#promiseCard')) {
        openPromise();
    }
});

document.querySelector('.close-promise-lightbox')?.addEventListener('click', closePromise);

document.querySelectorAll('.moment-card').forEach((card) => {
    card.addEventListener('click', () => {
        openPhoto(card.querySelector('img'), Number(card.dataset.photoIndex || 0));
    });
});
