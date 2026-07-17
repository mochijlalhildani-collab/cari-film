import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 1. Tipe data untuk daftar film
interface Movie {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
}

// 2. Tipe data tambahan khusus untuk detail film (saat diklik)
interface MovieDetail extends Movie {
  overview: string;
  genres: { name: string }[];
  credits: {
    cast: { name: string; profile_path: string }[];
  };
  backdrop_path: string; 
}

function App() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  
  // State untuk Pencarian & Debounce
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  
  // State untuk Pop-up Detail Film
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // LOGIKA DEBOUNCE: Mencegah layar kedap-kedip
  // Aplikasi baru akan mencari film setelah kamu BERHENTI mengetik selama 0.5 detik
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500); 
    return () => clearTimeout(timer);
  }, [keyword]);

  // FETCH 1: Mengambil Daftar Film
  const fetchMovies = async (): Promise<Movie[]> => {
    const url = debouncedKeyword 
      ? `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${debouncedKeyword}&language=id-ID`
      : `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=id-ID`;
      
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal mengambil data dari server');
    const data = await response.json();
    return data.results || []; 
  };

  const { data: movies, isLoading: isMoviesLoading, isError: isMoviesError, error: moviesError } = useQuery<Movie[], Error>({
    queryKey: ['movies', debouncedKeyword], 
    queryFn: fetchMovies,         
  });

  // FETCH 2: Mengambil Detail 1 Film (Termasuk Aktor)
  const fetchMovieDetail = async (): Promise<MovieDetail | null> => {
    if (!selectedId) return null; // Jangan jalankan jika tidak ada film yang diklik
    const url = `https://api.themoviedb.org/3/movie/${selectedId}?api_key=${apiKey}&language=id-ID&append_to_response=credits`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal mengambil detail');
    return response.json();
  };

  const { data: detail, isLoading: isDetailLoading } = useQuery<MovieDetail | null, Error>({
    queryKey: ['movie', selectedId],
    queryFn: fetchMovieDetail,
    enabled: !!selectedId, // Fitur keren TanStack: Fetch ini hanya aktif kalau selectedId ada isinya
  });

  return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '20px 40px', backgroundColor: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#E50914', fontWeight: 'bold' }}>🍿 NontonKuy</h1>
        <input 
          type="text" 
          placeholder="Cari judul film..." 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ padding: '12px 20px', borderRadius: '25px', border: 'none', width: '300px', outline: 'none', backgroundColor: '#333', color: 'white', fontSize: '15px' }}
        />
      </nav>

      {/* KONTEN UTAMA */}
      <div style={{ padding: '40px', minHeight: '80vh' }}>
        <h2 style={{ marginBottom: '30px', fontSize: '22px', color: '#e5e5e5' }}>
          {debouncedKeyword ? `Hasil pencarian: "${debouncedKeyword}"` : '🔥 Film Terpopuler Saat Ini'}
        </h2>

        {isMoviesLoading && <h3>⏳ Mencari film...</h3>}
        {isMoviesError && <h3 style={{ color: 'red' }}>❌ Waduh, error: {moviesError?.message}</h3>}

        {!isMoviesLoading && !isMoviesError && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '30px' }}>
            
            {movies?.map((movie: Movie) => (
              // Menambahkan onClick untuk memunculkan Pop-up
              <div 
                key={movie.id} 
                onClick={() => setSelectedId(movie.id)}
                style={{ backgroundColor: '#222', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {movie.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} style={{ width: '100%', height: '330px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '330px', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Poster Tidak Ada</div>
                )}
                
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : '0'}</span>
                    <span>{movie.release_date ? movie.release_date.substring(0, 4) : '-'}</span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* POP-UP DETAIL FILM (MODAL) */}
      {selectedId && (
        <div 
          onClick={() => setSelectedId(null)} // Klik layar hitam untuk tutup
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}
        >
          {/* Kotak Pop-up */}
          <div 
            onClick={(e) => e.stopPropagation()} // Mencegah pop-up tertutup saat kotaknya diklik
            style={{ backgroundColor: '#181818', width: '800px', maxWidth: '100%', maxHeight: '90vh', borderRadius: '15px', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
          >
            {/* Tombol Silang (X) */}
            <button 
              onClick={() => setSelectedId(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: '#E50914', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontSize: '16px', zIndex: 10, fontWeight: 'bold' }}
            >
              ✕
            </button>

            {isDetailLoading ? (
              <div style={{ padding: '100px', textAlign: 'center' }}><h2>⏳ Memuat detail film...</h2></div>
            ) : detail ? (
              <div>
                {/* Gambar Latar Besar (Backdrop) */}
                {detail.backdrop_path && (
                  <div style={{ width: '100%', height: '350px', backgroundImage: `url(https://image.tmdb.org/t/p/w1280${detail.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to top, #181818, transparent)' }}></div>
                  </div>
                )}
                
                <div style={{ padding: '30px', marginTop: detail.backdrop_path ? '-100px' : '0', position: 'relative' }}>
                  <h1 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>{detail.title}</h1>
                  
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', color: '#ccc', fontSize: '14px' }}>
                    <span style={{ color: '#E50914', fontWeight: 'bold' }}>⭐ {detail.vote_average?.toFixed(1)}</span>
                    <span>•</span>
                    <span>{detail.release_date?.substring(0, 4)}</span>
                    <span>•</span>
                    <span>{detail.genres?.map(g => g.name).join(', ')}</span>
                  </div>
                  
                  <h3 style={{ margin: '0 0 10px 0' }}>Sinopsis</h3>
                  <p style={{ lineHeight: '1.6', color: '#bbb', marginBottom: '30px' }}>
                    {detail.overview || 'Sinopsis belum tersedia untuk film ini.'}
                  </p>

                  <h3 style={{ margin: '0 0 15px 0' }}>Pemeran Utama</h3>
                  {/* Deretan Foto Aktor yang bisa digeser (scroll) ke kanan */}
                  <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '15px' }}>
                    {detail.credits?.cast?.slice(0, 10).map((actor, idx) => (
                      <div key={idx} style={{ minWidth: '100px', textAlign: 'center' }}>
                        <img 
                          src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Photo'}
                          alt={actor.name}
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', backgroundColor: '#333' }}
                        />
                        <p style={{ margin: 0, fontSize: '13px', color: '#ddd' }}>{actor.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default App