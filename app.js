
const OMDB_API_KEY = "18927d2f";
const YOUTUBE_API_KEY = "AIzaSyBHMsO4fncOHrAbTUGYfs5-pWYsWyrdNaU"; 
const OMDB_BASE_URL = "https://www.omdbapi.com";
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";


let movies = [];
let books = [];
let watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
let youtubePlayer;
let currentTrailerSource = "youtube"; 


const moviesGrid = document.getElementById("movies-grid");
const booksGrid = document.getElementById("books-grid");
const watchlistMoviesGrid = document.getElementById("watchlist-movies-grid");
const watchlistBooksGrid = document.getElementById("watchlist-books-grid");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");
const closeBtn = document.querySelector(".close");
const movieSearch = document.getElementById("movie-search");
const bookSearch = document.getElementById("book-search");

async function fetchMovieTrailers(movie) {
    try {
        console.log('Starting trailer fetch for:', movie.title);
        console.log('Movie details:', movie);

       
        console.log('Fetching YouTube trailer...');
        const youtubeTrailer = await fetchYouTubeTrailer(movie.title, movie.year);
        console.log('YouTube trailer result:', youtubeTrailer);

       
        console.log('Fetching OMDB trailer info...');
        const omdbTrailer = await fetchOMDBTrailer(movie.id);
        console.log('OMDB trailer result:', omdbTrailer);

        return {
            youtube: youtubeTrailer,
            omdb: omdbTrailer
        };
    } catch (error) {
        console.error('Error in fetchMovieTrailers:', error);
        throw error;
    }
}

async function fetchYouTubeTrailer(movieTitle, year) {
    try {
        const query = `${movieTitle} ${year} official trailer`;
        console.log('YouTube search query:', query);

        const searchParams = new URLSearchParams({
            part: 'id',
            q: query,
            key: YOUTUBE_API_KEY,
            maxResults: '1',
            type: 'video',
            videoCategoryId: '1',
            videoEmbeddable: 'true'
        });

        const url = `${YOUTUBE_SEARCH_URL}?${searchParams.toString()}`;
        console.log('YouTube API URL:', url);

        const response = await fetch(url);
        console.log('YouTube API Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('YouTube API error response:', errorText);
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('YouTube API response data:', data);

        if (data.error) {
            console.error('YouTube API returned error:', data.error);
            return null;
        }

        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            console.log('Found YouTube video ID:', videoId);
            return videoId;
        }

        console.log('No YouTube results found');
        return null;
    } catch (error) {
        console.error('Error in fetchYouTubeTrailer:', error);
        return null;
    }
}

async function fetchOMDBTrailer(imdbId) {
    try {
        const response = await fetch(
            `${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`
        );

        if (!response.ok) {
            throw new Error(`OMDB API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('OMDB API response:', data);

      
        const possibleTrailerUrl = data.Website || data.strTrailer;

       
        if (possibleTrailerUrl && (
            possibleTrailerUrl.includes('youtube.com') ||
            possibleTrailerUrl.includes('imdb.com/video') ||
            possibleTrailerUrl.includes('vimeo.com')
        )) {
            return possibleTrailerUrl;
        }

        
        return `https://www.imdb.com/title/${imdbId}/videogallery`;
    } catch (error) {
        console.error('Error fetching OMDB trailer:', error);
        return null;
    }
}


async function fetchMovies(query = "marvel") {
    try {
        moviesGrid.innerHTML = '<div class="loading">Loading movies...</div>';
        const searchResponse = await fetch(
            `${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`,
        );
        const searchData = await searchResponse.json();

        if (searchData.Response === "True") {
            movies = await Promise.all(
                searchData.Search.map(async (movie) => {
                    const detailResponse = await fetch(
                        `${OMDB_BASE_URL}/?apikey=${OMDB_API_KEY}&i=${movie.imdbID}`,
                    );
                    const detailData = await detailResponse.json();

                    return {
                        id: detailData.imdbID,
                        title: detailData.Title,
                        overview: detailData.Plot,
                        posterUrl:
                            detailData.Poster !== "N/A"
                                ? detailData.Poster
                                : "https://via.placeholder.com/300x450",
                        rating: parseFloat(detailData.imdbRating) || 0,
                        year: detailData.Year,
                        director: detailData.Director,
                        actors: detailData.Actors,
                    };
                }),
            );
        } else {
            movies = [];
        }

        renderMovies();
    } catch (error) {
        console.error("Error fetching movies:", error);
        moviesGrid.innerHTML =
            '<div class="error">Error loading movies. Please try again later.</div>';
    }
}

async function fetchBooks(query = "") {
    try {
        booksGrid.innerHTML = '<div class="loading">Loading books...</div>';
        const endpoint = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query || "subject:fiction")}&maxResults=20`;
        const response = await fetch(endpoint);
        const data = await response.json();

        books = data.items.map((book) => ({
            id: book.id,
            title: book.volumeInfo.title,
            author: book.volumeInfo.authors
                ? book.volumeInfo.authors.join(", ")
                : "Unknown Author",
            coverUrl:
                book.volumeInfo.imageLinks?.thumbnail ||
                "https://via.placeholder.com/300x450",
            description:
                book.volumeInfo.description || "No description available",
            rating: book.volumeInfo.averageRating || 0,
            previewLink: book.volumeInfo.previewLink || null,
        }));

        renderBooks();
    } catch (error) {
        console.error("Error fetching books:", error);
        booksGrid.innerHTML =
            '<div class="error">Error loading books. Please try again later.</div>';
    }
}


let movieSearchTimeout;
movieSearch.addEventListener("input", (e) => {
    clearTimeout(movieSearchTimeout);
    movieSearchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        fetchMovies(query || "marvel");
    }, 500);
});

let bookSearchTimeout;
bookSearch.addEventListener("input", (e) => {
    clearTimeout(bookSearchTimeout);
    bookSearchTimeout = setTimeout(() => {
        fetchBooks(e.target.value);
    }, 500);
});

closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
        if (youtubePlayer) {
            youtubePlayer.destroy();
            youtubePlayer = null;
        }
    }
});

// Navigation and Watchlist Toggle
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");
    document.getElementById(`${sectionId}-btn`).classList.add("active");

    if (sectionId === "watchlist") {
        renderWatchlist();
    }
}

function switchWatchlistView(type) {
    const movieBtn = document.getElementById("watchlist-movies-btn");
    const bookBtn = document.getElementById("watchlist-books-btn");
    const movieSection = document.getElementById("watchlist-movies");
    const bookSection = document.getElementById("watchlist-books");

    if (type === "movies") {
        movieBtn.classList.add("active");
        bookBtn.classList.remove("active");
        movieSection.classList.add("active");
        bookSection.classList.remove("active");
    } else {
        movieBtn.classList.remove("active");
        bookBtn.classList.add("active");
        movieSection.classList.remove("active");
        bookSection.classList.add("active");
    }
}

// Render Function
function renderMovies() {
    if (movies.length === 0) {
        moviesGrid.innerHTML =
            '<div class="no-results">No movies found. Try a different search.</div>';
        return;
    }
    moviesGrid.innerHTML = movies
        .map((movie) => createMovieCard(movie))
        .join("");
}

function renderBooks() {
    if (books.length === 0) {
        booksGrid.innerHTML =
            '<div class="no-results">No books found. Try a different search.</div>';
        return;
    }
    booksGrid.innerHTML = books.map((book) => createBookCard(book)).join("");
}

function renderWatchlist() {
    const movieWatchlist = watchlist
        .filter((item) => item.type === "movie")
        .map((item) => movies.find((movie) => movie.id === item.id))
        .filter(Boolean);

    const bookWatchlist = watchlist
        .filter((item) => item.type === "book")
        .map((item) => books.find((book) => book.id === item.id))
        .filter(Boolean);

    watchlistMoviesGrid.innerHTML = movieWatchlist.length
        ? movieWatchlist.map((movie) => createMovieCard(movie)).join("")
        : '<div class="no-results">No movies in watchlist</div>';

    watchlistBooksGrid.innerHTML = bookWatchlist.length
        ? bookWatchlist.map((book) => createBookCard(book)).join("")
        : '<div class="no-results">No books in watchlist</div>';
}

function createMovieCard(movie) {
    const isInWatchlist = watchlist.some(
        (item) => item.id === movie.id && item.type === "movie",
    );
    return `
        <div class="card">
            <div class="card-image" onclick="showMovieDetails('${movie.id}')">
                <img src="${movie.posterUrl}" alt="${movie.title}">
            </div>
            <div class="card-content">
                <h3 class="card-title">${movie.title} (${movie.year})</h3>
                <div class="card-rating">★ ${movie.rating.toFixed(1)}</div>
                <div class="card-actions">
                    <button 
                        onclick="toggleWatchlist('${movie.id}', 'movie')"
                        class="watchlist-btn ${isInWatchlist ? "remove" : ""}"
                    >
                        ${isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    </button>
                    <button onclick="showMovieDetails('${movie.id}')" class="trailer-btn">
                        Watch Trailer
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createBookCard(book) {
    const isInWatchlist = watchlist.some(
        (item) => item.id === book.id && item.type === "book",
    );
    return `
        <div class="card">
            <div class="card-image">
                <img src="${book.coverUrl}" alt="${book.title}">
            </div>
            <div class="card-content">
                <h3 class="card-title">${book.title}</h3>
                <p>${book.author}</p>
                <div class="card-rating">★ ${book.rating.toFixed(1)}</div>
                <div class="card-actions">
                    <button 
                        onclick="toggleWatchlist('${book.id}', 'book')"
                        class="watchlist-btn ${isInWatchlist ? "remove" : ""}"
                    >
                        ${isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    </button>
                    ${
                        book.previewLink
                            ? `
                        <a href="${book.previewLink}" target="_blank" class="preview-btn">
                            Preview Book
                        </a>
                    `
                            : ""
                    }
                </div>
            </div>
        </div>
    `;
}

// Watchlist Functions
function toggleWatchlist(id, type) {
    const index = watchlist.findIndex(
        (item) => item.id === id && item.type === type,
    );

    if (index === -1) {
        watchlist.push({ id, type });
    } else {
        watchlist.splice(index, 1);
    }

    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    renderMovies();
    renderBooks();
    renderWatchlist();
}

// YouTube Integration
async function showMovieDetails(id) {
    const movie = movies.find(m => m.id === id);
    if (!movie) {
        console.error('Movie not found:', id);
        return;
    }

    console.log('Showing details for movie:', movie.title);

  
    modalContent.innerHTML = '<div class="loading">Loading trailer information...</div>';
    modal.style.display = 'block';

    try {
        console.log('Fetching trailers for movie:', movie.title);
        const trailers = await fetchMovieTrailers(movie);
        console.log('Fetched trailers:', trailers);

        modalContent.innerHTML = `
            <div class="modal-grid">
                <div class="modal-image">
                    <img src="${movie.posterUrl}" alt="${movie.title}">
                </div>
                <div class="modal-info">
                    <h2>${movie.title} (${movie.year})</h2>
                    <p class="rating">★ ${movie.rating.toFixed(1)}</p>
                    <div class="movie-details">
                        <p><strong>Director:</strong> ${movie.director}</p>
                        <p><strong>Cast:</strong> ${movie.actors}</p>
                    </div>
                    <p>${movie.overview}</p>

                    ${(trailers.youtube || trailers.omdb) ? `
                        <div class="trailer-controls">
                            ${trailers.youtube ? `
                                <button onclick="switchTrailerSource('youtube')" class="trailer-switch ${currentTrailerSource === 'youtube' ? 'active' : ''}">
                                    YouTube Trailer
                                </button>
                            ` : ''}
                            ${trailers.omdb ? `
                                <button onclick="switchTrailerSource('omdb')" class="trailer-switch ${currentTrailerSource === 'omdb' ? 'active' : ''}">
                                    OMDB Source
                                </button>
                            ` : ''}
                        </div>

                        <div id="youtube-container" class="video-container" style="display: ${currentTrailerSource === 'youtube' ? 'block' : 'none'}">
                            ${trailers.youtube ? `
                                <div id="youtube-player"></div>
                            ` : '<p>YouTube trailer not available</p>'}
                        </div>

                        <div id="omdb-container" class="video-container" style="display: ${currentTrailerSource === 'omdb' ? 'block' : 'none'}">
                            ${trailers.omdb ? `
                                <a href="${trailers.omdb}" target="_blank" class="trailer-btn">
                                    Watch on IMDb
                                </a>
                            ` : '<p>OMDB source not available</p>'}
                        </div>
                    ` : '<p class="no-trailer">No trailer sources available for this movie</p>'}
                </div>
            </div>
        `;

        console.log('YouTube player status:', {
            trailerExists: !!trailers.youtube,
            currentSource: currentTrailerSource,
            ytDefined: typeof YT !== 'undefined',
            ytPlayerDefined: typeof YT !== 'undefined' && !!YT.Player
        });

        if (trailers.youtube && currentTrailerSource === 'youtube' && typeof YT !== 'undefined' && YT.Player) {
            // Ensure we destroy any existing player
            if (youtubePlayer) {
                console.log('Destroying existing YouTube player');
                youtubePlayer.destroy();
                youtubePlayer = null;
            }

            console.log('Creating YouTube player with video ID:', trailers.youtube);
            youtubePlayer = new YT.Player('youtube-player', {
                height: '360',
                width: '640',
                videoId: trailers.youtube,
                playerVars: {
                    'autoplay': 0,
                    'controls': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 1,
                    'fs': 1,
                    'playsinline': 1
                },
                events: {
                    'onReady': function(event) {
                        console.log('YouTube player is ready');
                    },
                    'onStateChange': function(event) {
                        console.log('YouTube player state changed:', event.data);
                    },
                    'onError': function(event) {
                        console.error('YouTube player error:', event.data);
                    }
                }
            });
        } else {
            console.log('Could not create YouTube player:', {
                hasTrailer: !!trailers.youtube,
                correctSource: currentTrailerSource === 'youtube',
                ytAvailable: typeof YT !== 'undefined',
                ytPlayerAvailable: typeof YT !== 'undefined' && !!YT.Player
            });
        }
    } catch (error) {
        console.error('Error showing movie details:', error);
        modalContent.innerHTML = `
            <div class="modal-grid">
                <div class="modal-image">
                    <img src="${movie.posterUrl}" alt="${movie.title}">
                </div>
                <div class="modal-info">
                    <h2>${movie.title} (${movie.year})</h2>
                    <p class="rating">★ ${movie.rating.toFixed(1)}</p>
                    <div class="movie-details">
                        <p><strong>Director:</strong> ${movie.director}</p>
                        <p><strong>Cast:</strong> ${movie.actors}</p>
                    </div>
                    <p>${movie.overview}</p>
                    <p class="error">Error loading trailer information. Please try again later.</p>
                </div>
            </div>
        `;
    }
}

function switchTrailerSource(source) {
    currentTrailerSource = source;
    const youtubeContainer = document.getElementById("youtube-container");
    const omdbContainer = document.getElementById("omdb-container");

    if (source === "youtube") {
        youtubeContainer.style.display = "block";
        omdbContainer.style.display = "none";
    } else {
        youtubeContainer.style.display = "none";
        omdbContainer.style.display = "block";
    }

    document.querySelectorAll(".trailer-switch").forEach((btn) => {
        btn.classList.toggle(
            "active",
            btn.textContent.toLowerCase().includes(source),
        );
    });
}


fetchMovies();
fetchBooks();
