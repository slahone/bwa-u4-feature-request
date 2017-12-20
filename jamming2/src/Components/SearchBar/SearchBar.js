import React from 'react';
import ReactTooltip from 'react-tooltip';
import './SearchBar.css';

class SearchBar extends React.Component {
  constructor (props) {
      super (props);
      this.state = {
        term: ''
      }
      this.search = this.search.bind (this);
      this.searchTerm = this.searchTerm.bind (this);
      this.handleTermChange = this.handleTermChange.bind (this);
      this.getPlaylists = this.getPlaylists.bind (this);
  }

  search() {
    if (!this.state)
    if (!this.state.term) return;
    if (this.state.term.length===0) return;
    this.props.onSearch (this.state.term, 0);
  }

  getPlaylists() {
    console.log (this.props);
    this.props.getLists();
  }

  handleTermChange (event) {
    //console.log ('Searching for');
    //console.log (event.target.value);
    this.setState ({
      term: event.target.value
    });
  }

  searchTerm() {
    return this.state.term;
  }

  render() {
    //console.log (this.props);
    return (
      <div className="SearchBar">
        <ReactTooltip />
        <input placeholder="Enter A Song, Album, or Artist" onChange={this.handleTermChange} defaultValue={this.props.term} />
        <div className="SearchBar"><table><tbody><tr><td><a onClick={this.getPlaylists} className="Playlists-get" data-tip="Click to load playlists">Playlists</a></td><td><a className="Searchbar-search" onClick={this.search} >SEARCH</a></td></tr></tbody></table></div>
      </div>
    );
  }
}

export default SearchBar;
