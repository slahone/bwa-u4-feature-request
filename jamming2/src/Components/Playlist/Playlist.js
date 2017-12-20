import React from 'react';
import './Playlist.css';
import TrackList from '../TrackList/TrackList';

class Playlist extends React.Component {
  constructor (props) {
    super (props);
    this.handleNameChange = this.handleNameChange.bind (this);
    this.handleClearPlaylist = this.handleClearPlaylist.bind (this);
  }

  handleNameChange (event) {
    this.props.onNameChange (event.target.value);
  }

  handleClearPlaylist (event) {
    console.log (this.props);
    this.props.onClear();
  }

  render() {
    let totalPlayTime = 0;
    this.props.playlistTracks.forEach (track => totalPlayTime += track.duration);
    const minutes = Math.floor (totalPlayTime / 60000);
    const seconds = Math.ceil ((totalPlayTime / 1000) % 60);
    const playTime = totalPlayTime===0?'':`${minutes}:${('00'+seconds).substr(-2,2)}`;
    return (
      <div className="Playlist">
        <span className="Playlist-time">{playTime}</span>
        <input value={this.props.playlistName} onChange={this.handleNameChange} />
        <TrackList tracks={this.props.playlistTracks} onRemove={this.props.onRemove}  isRemoval={true} />
        <a className="Playlist-save" onClick={this.props.onSave} >SAVE TO SPOTIFY</a>
        <a className="Playlist-save" onClick={this.handleClearPlaylist} >Clear</a>
      </div>
    );
  }
}

export default Playlist;
