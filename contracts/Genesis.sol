//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Genesis is ERC721, VRFConsumerBase, Ownable {
    enum TokenType {
        GOD,
        DEMIGOD,
        ELEMENTAL
    }
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    // Chainlink
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public randomResult;
    address public VRFCoordinator;
    address public LinkToken;
    mapping(bytes32 => address) public requestIdToSender;
    mapping(uint256 => uint256) public tokenIdToRandomNumber;
    mapping(bytes32 => uint256) public requestIdToTokenId;

    Counters.Counter private _nextTokenId;

    // TODO Adjust after testing phase
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant MAX_PER_MINT = 2;
    bool public presaleActive = false;
    bool public mintActive = false;
    bool public reservesMinted = false;
    string public baseTokenURI;

    /**
     * Collection properties
     */
    // Gods
    uint256 private godsCount = 50;

    // Demi-Gods
    uint256 private demiGodsCount = 400;

    // Elementals
    uint256 private elementalsCount = 550;

    constructor(
        address _VRFCoordinator,
        address _LinkToken,
        bytes32 _keyhash,
        string memory baseURI
    )
        VRFConsumerBase(_VRFCoordinator, _LinkToken)
        ERC721("Mythical Sega", "MS")
    {
        _nextTokenId.increment();
        setBaseURI(baseURI);
        VRFCoordinator = _VRFCoordinator;
        LinkToken = _LinkToken;
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
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

    function flipPresaleActive() public onlyOwner {
        presaleActive = !presaleActive;
    }

    function flipMintActive() public onlyOwner {
        mintActive = !mintActive;
    }

    // TODO Figure out how we want to reserve the NFTs for the team
    function reserveNFTs() public onlyOwner {
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex.add(10) < MAX_SUPPLY, "Not enough NFTs");

        for (uint256 i = 0; i < 10; i++) {
            _safeMint(msg.sender, mintIndex);
        }
    }

    /**
     * VRFConsumerBase
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber)
        internal
        override
    {
        address nftOwner = requestIdToSender[requestId];
        uint256 tokenId = requestIdToTokenId[requestId];
        _safeMint(nftOwner, tokenId);
        tokenIdToRandomNumber[tokenId] = randomNumber;
    }

    /**
     * Minting functions
     */
    function mintNFTs(uint256 _count) public payable {
        require(mintActive, "Minting is not active yet!");
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex + _count <= MAX_SUPPLY, "NFTs sold out");
        require(msg.value >= PRICE * _count, "Not enough ETH");

        for (uint256 i = 0; i < _count; i++) {
            // TODO Validate this
            mintIndex = _nextTokenId.current();
            _nextTokenId.increment();
            generateRandomProperties(mintIndex);
        }
    }

    function mint() public payable {
        require(mintActive, "Minting is not active yet!");

        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex <= MAX_SUPPLY, "NFTs sold out");
        require(msg.value >= PRICE, "Not enough ETH");

        _nextTokenId.increment();
        generateRandomProperties(mintIndex);
    }

    function generateRandomProperties(uint256 _tokenId)
        internal
        returns (bytes32 requestId)
    {
        requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = msg.sender;
        requestIdToTokenId[requestId] = _tokenId;
    }

    /**
     * Enumerable
     */
    // function tokensOfOwner(address _owner)
    //     external
    //     view
    //     returns (uint256[] memory)
    // {
    //     uint256 tokenCount = balanceOf(_owner);
    //     uint256[] memory tokensId = new uint256[](tokenCount);
    //     for (uint256 i = 0; i < tokenCount; i++) {
    //         tokensId[i] = tokenOfOwnerByIndex(_owner, i);
    //     }

    //     return tokensId;
    // }

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
