//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Genesis is ERC721Enumerable, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // TODO Adjust after testing phase
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant MAX_PER_MINT = 5;

    string public baseTokenURI;

    constructor(string memory baseURI) ERC721("Mythical Sega", "MS") {
        setBaseURI(baseURI);
    }

    /**
     * Getters
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * Setters
     */
    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    // TODO Figure out how we want to reserve the NFTs for the team
    function reserveNFTs() public onlyOwner {
        uint256 totalMinted = _tokenIds.current();
        require(totalMinted.add(10) < MAX_SUPPLY, "Not enough NFTs");

        for (uint256 i = 0; i < 10; i++) {
            _mintSingleNFT();
        }
    }

    /**
     * Minting functions
     */
    function mintNFTs(uint256 _count) public payable {
        uint256 totalMinted = _tokenIds.current();
        require(totalMinted.add(_count) <= MAX_SUPPLY, "Not enough NFTs!");
        require(
            _count > 0 && _count <= MAX_PER_MINT,
            "Cannot mint specified number of NFTs."
        );
        require(
            msg.value >= PRICE.mul(_count),
            "Not enough ether to purchase NFTs."
        );
        // TODO There is a better to do this than from a loop
        for (uint256 i = 0; i < _count; i++) {
            _mintSingleNFT();
        }
    }

    function _mintSingleNFT() private {
        uint256 newTokenID = _tokenIds.current();
        _safeMint(msg.sender, newTokenID);
        _tokenIds.increment();
    }

    /**
     * Enumerable
     */
    function tokensOfOwner(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokensId = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }

        return tokensId;
    }

    /**
     * Withdrawing
     */
    // TODO Add the logic to distribute funds amongst the team
    function withdraw() public payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }
}
