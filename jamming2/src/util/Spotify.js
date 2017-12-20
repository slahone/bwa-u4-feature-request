const CLIENT_ID = '5c75b2e57cf5428b9e483436fc66d290';

const REDIRECT_URI = 'https://sl_codeacademy.surge.sh/';
//const REDIRECT_URI = 'http://localhost:3000/';

let accessToken;

//*******************************************************************
// Extract the access token from the window location href value.
// These are prefaced by access_token= and expires_in= tokens. So we
// regex the sections out of the href, delete the prefixes and we are
// good to go if they exist.  Then convert the expires_in parameter
// to a number and return the two values as a single object.
//*******************************************************************
let Spotify = {
  getTokenFromURL() {
    let url = window.location.href;
    //console.log ('From URL: ' + url);
    let accessToken = url.match (/access_token=([^&]*)/);
    let expiresIn = url.match (/expires_in=([^&,]*)/);


    //console.log ('Expires ' + expiresIn);
    if (accessToken) {
        accessToken = accessToken.toString().substr (13);
        if (expiresIn) expiresIn = Number (expiresIn.toString().substr (11).split(',')[0]);
        //console.log (`Access Token ${accessToken} Expires ${expiresIn}`);
        return {
          token: accessToken,
          expires: expiresIn
        };
      } else {
        return null;
      }

  },

  currentToken() {
    return accessToken;
  },

  //*******************************************************************
  // Retrieve the access token from Spotify.  Note that this did not
  // work as expected.  Trying to structure the returned value as a
  // Promise blew up in my face. Thus the more mundane return accessToken
  // call in the very beginning. If accessToken is not defined, then we
  // try to retrieve the access token from the window URL. The values
  // are returned as the accessToken and the expiry value. We set the
  // window timeout to the expiry time in milliseconds. If the access
  // token is not available in either place, we fetch it from Spotify
  // using the Authorize endpoint.  Currently we do this by setting
  // the window location to the computed URI.  The redirect takes care
  // of bringing the page back to localhost:3000.  There is definitely
  // room for huge anounts of improvement here. Known Issue: You have to
  // manually run two searches to acquire the token the first time.
  // Have to chnage it to a single automatic access somehow.
  //*******************************************************************

  getAccessToken() {
    if (accessToken) {
      return accessToken;
    }
    let tokens = Spotify.getTokenFromURL();
    if (tokens !== null) {
      accessToken = tokens.token;
      //console.log (`Access Token ${accessToken} Expires ${tokens.expires.toString()}`);
      //console.log ('Timeout in ' + tokens.expires.toString() + ' seconds');
      window.setTimeout(() => accessToken = null, tokens.expires * 1000);
      window.history.pushState('Access Token', null, '/');
      //console.log ('Acquired Token ' + tokens.token);
      return accessToken;
    }
    let uri = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=playlist-modify-public`;
    window.location = uri;
  },

  //*******************************************************************
  // Here we search Spotify for any matching track, given the search
  // term.  First we acquire the access token for the known client ID
  // then search Spotify using the query endpoint. From the response
  // to this query, we create the array of track objects with the desired
  // properties.  Then we set that array into the state of the app object.
  // We also call the playlistNames function to retrieve the list of
  // current playlists and insert that into the app state as well.
  // Note: The current code requires two setState calls and potentially
  // two render calls as a result.  Given that React will update only
  // the changed potions, but possibly some efficiency can be gained here.
  //*******************************************************************
  search (term, page, app) {
    let myAccessToken = Spotify.getAccessToken();
    //console.log ('Return: ' + accessToken);
    if (!accessToken) {
      console.log ('Unable to acquire access token');
      return [];
    }

    let headers = {
      'headers': {
        'Content-type': 'application/json',
        'Authorization': `Bearer ${myAccessToken}`
      }
    }
    //console.log (`Offset ${page*20}`);
    const URL = `https://api.spotify.com/v1/search?type=track&offset=${page*20}&q=${term}`;
    //console.log (URL);
    fetch (URL, headers).then (response => {
            //console.log ('Search OK');
            //console.log (response);
            if (response.ok) {
              return response.json();
            }
            throw new Error ('Unable to conduct search on Spotify!');
          },
          networkError => console.log ('Request Failed!')
        )
        .then ( jsonResponse => {
          let totalTracks = jsonResponse.tracks.total;
          let spotifyTracks = jsonResponse.tracks.items;
          let tracks = spotifyTracks.map (item => {
          return {
              ID: item.id,
              Artist: item.artists[0].name,
              Name: item.name,
              Album: item.album.name,
              duration: item.duration_ms,
              URI: item.uri
            };
          });
          Spotify.playListNames (app);
          if (tracks) app.setState ({
            searchResults: tracks,
            totalTracks: totalTracks,
            pageNum: page
          });
          //console.log (jsonResponse);
        })
  },

  //*******************************************************************
  // Save the currene play list. Parameters are the playlist name, the
  // tracks array, and the app object. We first retrieve the access token
  // then retrieve the Spotify user ID (note, NOT the client ID), then
  // interpolate that into the URL for the endpoint. We then create the
  // playlist using that endpoint and the playlist name.  Next we can
  // extract the tracks href from the response to the above create call
  // and lastly we create the actual track list under that playlist.
  // Once that is all done, we can add the playlist name to the list of
  // current playlists and render the new list. Oh yes, we clean up after
  // ourselves too in the same setState call.
  //*******************************************************************
  savePlaylist (name, tracks, app) {
    if (name.length===0) return;
    if (tracks.length===0) return;

    let accessTok = Spotify.getAccessToken();
    let headers = {
      headers : {
        'Authorization': `Bearer ${accessTok}`
    }};
    fetch (`https://api.spotify.com/v1/me`, headers)
    .then (response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error ('Could not retrieve user identity');
      },
      networkError => console.log ("Request failed!")
    )
    .then (jsonResponse =>  {
        let clientUserID = jsonResponse.id;

        // first check if the playlist already exists
        //console.log ('playlist names');
        //console.log (app.state.playlists);
        let existing = app.state.playlists.filter (playlist => playlist.name===name);
        //console.log ('Existing Playlists that match:');
        //console.log (existing);
        if (existing.length > 0) {
          let playlistID = existing[0].id;
          //console.log (`Playlist ID = ${playlistID}`);
          //*********************************************************
          // playlist exists, get track listing
          //*********************************************************
          const endpoint = `https://api.spotify.com/v1/users/${clientUserID}/playlists/${playlistID}/tracks`;

          let requestData = {
            'headers': {
              'Authorization': `Bearer ${accessTok}`,
              'Content-type': 'application/json'
            }
          };
          fetch (endpoint+'?fields=(items.track.id)', requestData).then ( response => {
                if (response.ok) {
                  return response.json();
                }
                throw new Error ('Unable to retrieve Playlist tracks');
              },
              networkError => console.log ('Request Failed!')
            ).then (jsonResponse => {
              //console.log ('Playlist Tracks');
              //console.log (jsonResponse);
              let curTracks = jsonResponse.items.map (item => item.track.id);
              let trackURI = [];
              let newTrackID = app.state.playlistTracks.map (track => track.ID);  // the ID listing of playlist tracks
              // first check that all old tracks are still there
              // trackURI will contain all track IDs that have been deleted
              let position = 0;
              curTracks.forEach (function (id) {
                if (!newTrackID.includes (id)) trackURI.push ({"uri" : `spotify:track:${id}`, 'position' : [position] });
                position++;
              })
              if (trackURI.length>0) {
                //console.log (trackURI);
                let postData = {
                  'method': 'DELETE',
                  'headers': {
                    'Authorization': `Bearer ${accessTok}`,
                    'Content-type': 'application/json'
                  },
                  'body': JSON.stringify ({ "tracks" : trackURI })
                };
                //console.log (postData);
                fetch (endpoint, postData).then ( response => {
                      if (response.ok) {
                        return response.json();
                      }
                      throw new Error ('Failed to remove deleted tracks');
                    },
                    networkError => console.log ('Request Failed!')
                ).then (jsonResponse => {
                  //console.log ('Removed Deleted Tracks');
                  //console.log (jsonResponse);
                })
              }

              trackURI = [];
              app.state.playlistTracks.forEach (function (track) {
                  if (!curTracks.includes (track.ID)) trackURI.push (`spotify:track:${track.ID}`);
                }
              );
              if (trackURI.length===0) return; // no new tracks found
              //console.log ('Track ID list');
              //console.log (trackURI);
              let postData = {
                'method': 'POST',
                'headers': {
                  'Authorization': `Bearer ${accessTok}`,
                  'Content-type': 'application/json'
                },
                'body': JSON.stringify (trackURI)
              };
              //console.log (postData);
              //console.log (playlistURL);
              fetch (endpoint, postData).then ( response => {
                    if (response.ok) {
                      return response.json();
                    }
                    throw new Error ('Failed to upload track list');
                  },
                  networkError => console.log ('Request Failed!')
              ).then (jsonResponse => {
                //console.log ('Saved Playlist Details');
                //console.log (jsonResponse);
              })
            })
          return;
        }
        //console.log ('Using ID for ' + clientUserID);
        let endPoint = `https://api.spotify.com/v1/users/${clientUserID}/playlists`;
        let postBody = {
          'name': name,
          'public': true
        }
        let postData = {
          'method': 'POST',
          'headers': {
            'Authorization': `Bearer ${accessTok}`,
            'Content-type': 'application/json'
          },
          'body': JSON.stringify (postBody)
        };
        fetch (endPoint, postData).then ( response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error ('Unable to create new Playlist');
          },
          networkError => console.log ('Request Failed!')
        ).then (jsonResponse => {
            //console.log (jsonResponse);
            //let playlistID = jsonResponse.id;
            let playlistURL = jsonResponse.tracks.href;
            let trackURI = tracks.map (track => `spotify:track:${track.ID}`);
            //console.log ('Track ID list');
            //console.log (trackURI);
            let postData = {
              'method': 'POST',
              'headers': {
                'Authorization': `Bearer ${accessTok}`,
                'Content-type': 'application/json'
              },
              'body': JSON.stringify (trackURI)
            };
            //console.log (postData);
            //console.log (playlistURL);
            fetch (playlistURL, postData).then ( response => {
                  if (response.ok) {
                    return response.json();
                  }
                  throw new Error ('Failed to upload track list');
                },
                networkError => console.log ('Request Failed!')
            ).then (jsonResponse => {
              //console.log ('Saved Playlist Details');
              //console.log (jsonResponse);
              let url = `https://api.spotify.com/v1/users/${clientUserID}/playlists`;
              let headers = {
                headers : {
                  'Authorization': `Bearer ${accessToken}`
              }};
              fetch (url, headers).then(response => {
                  if (response.ok) {
                    return response.json();
                  }
                  throw new Error ('Unable to retrieve playlists.');
                },
                networkError => console.log ('Request failed')
              ).then ( jsonResponse => {
                  //console.log ('List of playlists');
                  //console.log (jsonResponse);
                  let playlist = jsonResponse.items.map (item => {
                    return {
                        id:item.id,
                        name: item.name
                      }
                    }
                  );
                  app.setState ({
                    playlists: playlist,
                    searchResults: [],
                    playlistName: "New Playlist",
                    playlistTracks: [],
                    pageNum: 0,
                    totalTracks: 0
                  })
              })
            })
          })
        })
  },

  //*******************************************************************
  // Returns the current playlist names. We pass in the app object for
  // updates after we retrieve the list.  Yes, we probably should use
  // callbacks to the app object, but hey, this works for now.
  //*******************************************************************
  playListNames (app) {
    //console.log ('Creating playlist array');
    let accessToken = Spotify.getAccessToken();
    //console.log ('Me Token');
    //console.log (accessToken);
    let headers = {
      headers : {
        'Authorization': `Bearer ${accessToken}`
    }};
    fetch (`https://api.spotify.com/v1/me`, headers)
    .then (response => {
        //console.log ('Me Response');
        //console.log (response);
        if (response.ok) {
          return response.json();
        }
        throw new Error ('Could not retrieve user identity');
      },
      networkError => console.log ("Request failed!")
    )
    .then (jsonResponse =>  {
        let clientUserID = jsonResponse.id;
        //console.log ('Using ID for ' + clientUserID);
        let url = `https://api.spotify.com/v1/users/${clientUserID}/playlists`;
        let headers = {
          headers : {
            'Authorization': `Bearer ${accessToken}`
        }};
        fetch (url, headers).then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error ('Unable to retrieve playlists.');
          },
          networkError => console.log ('Request failed')
        ).then ( jsonResponse => {
            //console.log ('List of playlists');
            //console.log (jsonResponse);
            let playlist = jsonResponse.items.map (item => {
              return {
                  id:item.id,
                  name: item.name,
                  duration:item.duration_ms
                }
              }
            );
            //console.log (playlist);
            app.setState ({
              playlists: playlist
            })
        })
      })
  },

  //******************************************************************
  // remove a given playlist from Spotify. Well, you can not really
  // delete a playlist, but the DELETE methos will unfollow, with the
  // same result that the playlist disappears from your list
  //******************************************************************
  removePlaylist (playlist, app) {
    let accessToken = Spotify.getAccessToken(); // First, get the access token for this user
    let headers = {
      headers : {
        'Authorization': `Bearer ${accessToken}`
    }};
    fetch (`https://api.spotify.com/v1/me`, headers)  // next fetch the user's identity
    .then (response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error ('Could not retrieve user identity');
      },
      networkError => console.log ("Request failed!")
    )
    .then (jsonResponse =>  {
        let clientUserID = jsonResponse.id;
        //console.log ('Using ID for ' + clientUserID);
        let url = `https://api.spotify.com/v1/users/${clientUserID}/playlists/${playlist.id}/followers`;
        let postData = {    // Use the DELETE verb in this case
          'method': 'DELETE',
          'headers': {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        };
        fetch (url, postData).then(response => {
            if (response.ok) {
              return response.text(); // response is null and causes response.json() to fail, so use .text()
            }
            alert ('Unable to delete playlists.');
          },
          networkError => console.log ('Request failed')
        ).then ( textResponse => {
            //console.log ('List of playlists');
            //console.log (jsonResponse);
            let delID = playlist.id;
            //console.log ('deleting');
            //console.log (delID);
            app.setState ({
              playlists : app.state.playlists.filter (playlist => playlist.id !== delID)
            });

        })
      })
  },

  retrievePlaylist (playlist, app) {
    let playlistName = playlist.name;
    let accessToken = Spotify.getAccessToken(); // First, get the access token for this user
    let headers = {
      headers : {
        'Authorization': `Bearer ${accessToken}`
    }};
    fetch (`https://api.spotify.com/v1/me`, headers)  // next fetch the user's identity
    .then (response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error ('Could not retrieve user identity');
      },
      networkError => console.log ("Request failed!")
    )
    .then (jsonResponse =>  {
        let clientUserID = jsonResponse.id;
        //console.log ('Using ID for ' + clientUserID);
        let url = `https://api.spotify.com/v1/users/${clientUserID}/playlists/${playlist.id}/tracks`;
        let postData = {    // Use the DELETE verb in this case
          'headers': {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        };
        fetch (url, postData).then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error ('Unable to retrieve playlist tracks information!');
        },
        networkError => console.log ('Request failed!')
      )
      .then (jsonResponse => {
        //console.log (jsonResponse);
        let tracks = jsonResponse.items.map(item => {
          return {
            ID: item.track.id,
            Artist: item.track.artists[0].name,
            Name: item.track.name,
            Album: item.track.album.name,
            duration: item.track.duration_ms,
            URI: item.uri
          }
        })
        //console.log (playlistName);
        //console.log (tracks);
        let totalLength = 0;
        tracks.map (track => totalLength += track.duration);
        //console.log (`Total length: ${totalLength/100} seconds`);
        app.setState ({
          playlistName: playlistName,
          playlistTracks: tracks
        })
      })
    })
  }

};

export default Spotify;
