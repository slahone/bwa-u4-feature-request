import React from 'react';
import './SearchResults.css';
import TrackList from '../TrackList/TrackList';

class SearchResults extends React.Component {
  constructor (props) {
    super (props);
    this.handlePrev = this.handlePrev.bind (this);
    this.handleNext = this.handleNext.bind (this);
  }

  handlePrev(event) {
    //console.log (this.props);
    //const totalPages = Math.ceil(this.props.totalTracks/20);
    //console.log (`Total ${totalPages} Current ${this.props.pageNum}`);
    if (this.props.pageNum>0) this.props.incrementPage (-1);
  }

  handleNext(event) {
    //console.log (this.props);
    const totalPages = Math.ceil(this.props.totalTracks/20);
    //console.log (`Total ${totalPages} Current ${this.props.pageNum}`);
    if (this.props.pageNum<totalPages-1) this.props.incrementPage (1);
  }

  render() {
    const totalPages = Math.ceil(this.props.totalTracks/20);
    const totalTracks = this.props.totalTracks===0 ? '' : `(${this.props.totalTracks} hits)`;
    const pageInfo = this.props.totalTracks===0 ? '' :`Page ${this.props.pageNum+1}/${totalPages}`;
    return (
      <div className="SearchResults">
        <h5 className="TrackCounts">{totalTracks}</h5>
        <h5 className="PageCounts">{pageInfo}</h5>
        <h2 className="SearchHeader">Results</h2>
        {
          this.props.pageNum>0  &&
          <span>
            <div className="TracksMovePrev" width="100%" onClick={this.handlePrev}><a>Previous Page</a></div>
            <p>&nbsp;</p>
          </span>
        }
        <TrackList tracks={this.props.searchResults} onAdd ={this.props.onAdd}  isRemoval={false} />
        {
          ((this.props.pageNum<totalPages)&&(totalPages>1))  &&
          <span>
            <p>&nbsp;</p>
            <div className="TracksMoveNext" width="100%" onClick={this.handleNext}>
                <a>&nbsp;Next Page&nbsp;</a>
            </div>
          </span>

        }
      </div>
    );
  }
}

export default SearchResults;
