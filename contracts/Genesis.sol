//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
contract Genesis is ERC721Enumerable, Ownable {
    using SafeMath for uint256;
    // TODO: Use chainlink for randomization instead
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;

    uint public constant MAX_SUPPLY = 1000;
    uint public constant PRICE = 0.01 ether;
    uint public constant MAX_PER_MINT = 5;
        
    string public baseTokenURI;

    constructor(string memory baseURI) ERC721("pxMythics Genesis", "PXMG") {
     setBaseURI(baseURI);
    }

    function reserveNFTs() public onlyOwner {
     uint totalMinted = _tokenIds.current();
     require(
        totalMinted.add(10) < MAX_SUPPLY, "Not enough NFTs"
     );
     // TODO There is a better to do this than from a loop
     for (uint i = 0; i < 10; i++) {
          _mintSingleNFT();
     }
    }

    function _baseURI() internal 
                    view 
                    virtual 
                    override 
                    returns (string memory) {
     return baseTokenURI;
    }
    
    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
         baseTokenURI = _baseTokenURI;
    }   

    function mintNFTs(uint _count) public payable {
     uint totalMinted = _tokenIds.current();
     require(
       totalMinted.add(_count) <= MAX_SUPPLY, "Not enough NFTs!"
     );
     require(
       _count > 0 && _count <= MAX_PER_MINT, 
       "Cannot mint specified number of NFTs."
     );
     require(
       msg.value >= PRICE.mul(_count), 
       "Not enough ether to purchase NFTs."
     );
     // TODO There is a better to do this than from a loop
     for (uint i = 0; i < _count; i++) {
            _mintSingleNFT();
     }
    }

    function _mintSingleNFT() private {
      uint newTokenID = _tokenIds.current();
      _safeMint(msg.sender, newTokenID);
      _tokenIds.increment();
    }
}