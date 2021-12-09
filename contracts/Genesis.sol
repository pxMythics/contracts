//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";

contract Genesis is ERC721Pausable, VRFConsumerBase, Ownable {
    enum TokenType {
        GOD,
        DEMI_GOD,
        ELEMENTAL
    }
    struct TokenTraits { 
        TokenType tokenType;
        // TODO add other traits
    }
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    /**
     * Chainlink VRF
     */
    bytes32 internal keyHash;
    uint256 internal fee;
    mapping(bytes32 => address) internal requestIdToSender;
    mapping(bytes32 => uint256) internal requestIdToTokenId;
    event RequestedRandomNFT(bytes32 indexed requestId);
    event Minted(uint256 tokenId, TokenType tokenType);

    /**
     * Mint parameters
     */
    // TODO Adjust after testing phase
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant MAX_MINT_PER_WHITELIST = 1;
    uint256 public constant GODS_MAX_SUPPLY = 50;
    uint256 public constant DEMI_GODS_MAX_SUPPLY = 400;
    uint256 public constant ELEMENTALS_MAX_SUPPLY = 550;
    bool public mintActive = false;
    string public baseTokenURI;
    Counters.Counter private tokenCounter;
    Counters.Counter private randomNumberRequestsCounter;
    Counters.Counter private godsCounter;
    Counters.Counter private demiGodsCounter;
    Counters.Counter private elementalsCounter;

    /**
     * Minting properties
     */
    mapping(address => uint256) private addressToMintCount;
    mapping(address => uint256) private addressToRequestCount;
    bytes32 private merkleTreeRoot;
    mapping(uint256 => TokenTraits) public tokenIdToTraits;

    constructor(address vrfCoordinator, address linkToken, bytes32 _keyhash, string memory baseURI) VRFConsumerBase(vrfCoordinator, linkToken) ERC721("Mythical Sega", "MS") {
        tokenCounter.increment();   // we want to start the counter at 1
        setBaseURI(baseURI);
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
        _pause();
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
    function setMerkleTreeRoot(bytes32 _merkleTreeRoot) public onlyOwner {
        merkleTreeRoot = _merkleTreeRoot;
    }

    /**
    * Pause contract
    */
    function pause() public onlyOwner {
        _pause();
    }

    /**
    * Unpause contract
    */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * Mint a god
     * @param nftOwner address of the NFT owner
     * @param tokenId id of the token to be minted
     */
    function mintGod(address nftOwner, uint256 tokenId) private {
        godsCounter.increment();
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.GOD);
        _mint(nftOwner, tokenId);
    }

    /**
     * Mint a demi-god
     * @param nftOwner address of the NFT owner
     * @param tokenId id of the token to be minted
     */
    function mintDemiGod(address nftOwner, uint256 tokenId) private {
        demiGodsCounter.increment();
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.DEMI_GOD);
        _mint(nftOwner, tokenId);
    }

    /**
     * Mint an elemental
     * @param nftOwner address of the NFT owner
     * @param tokenId id of the token to be minted
     * @param randomNumber random number used to generate traits
     */
    function mintElemental(address nftOwner, uint256 tokenId, uint256 randomNumber) private {
        elementalsCounter.increment();
        // TODO add other traits
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.ELEMENTAL);
        _mint(nftOwner, tokenId);
    }

    /**
     * Mint a token
     * @param nftOwner address of the NFT owner
     * @param tokenId id of the token to be minted
     * @param randomNumber random number returned by Chainlink
     */
    function mint(address nftOwner, uint256 tokenId, uint256 randomNumber) private {
        tokenCounter.increment();
        addressToMintCount[nftOwner]++;
        TokenType tokenType = getTokenType(randomNumber);     
        if (tokenType == TokenType.GOD) {
            mintGod(nftOwner, tokenId);
        } else if (tokenType == TokenType.DEMI_GOD) {
            mintDemiGod(nftOwner, tokenId);
        } else {
            mintElemental(nftOwner, tokenId, randomNumber);
        }
        emit Minted(tokenId, tokenType);
    }

    /**
     * Callback when a random number gets generated
     * @param requestId id of the request sent to Chainlink
     * @param randomNumber random number returned by Chainlink
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        randomNumberRequestsCounter.decrement();
        address nftOwner = requestIdToSender[requestId];
        addressToRequestCount[nftOwner]--;
        mint(nftOwner, requestIdToTokenId[requestId], randomNumber);
    }

    /**
     * Requests minting
     * @return requestId request id that was sent to Chainlink VRF
     */
    function requestMint() private returns (bytes32 requestId) {
        addressToRequestCount[msg.sender]++;
        requestId = requestRandomNumberForTokenId(tokenCounter.current() + randomNumberRequestsCounter.current());
        randomNumberRequestsCounter.increment();
        emit RequestedRandomNFT(requestId);
        return requestId;
    }

    /**
     * Mint a given number of tokens
     * The sender has to be included in the free mint list (except if they are the owner)
     * @param count number of tokens to mint
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     */
    function freeMint(uint256 count, uint256 nonce, bytes32[] calldata proof) public payable {
        // TODO
    }

    /**
     * Mint 1 token
     * The sender has to be included in the whitelist (except if they are the owner)
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     * @return requestId request id that was sent to Chainlink VRF
     */
    function mintWhitelist(uint256 nonce, bytes32[] calldata proof) public payable whenNotPaused() mintable(1) 
    onlyWhitelist(nonce, proof) returns (bytes32 requestId) {
        require((addressToMintCount[msg.sender] + addressToRequestCount[msg.sender]) < MAX_MINT_PER_WHITELIST, "Already minted");
        return requestMint();
    }

    /**
     * Requests a random number to Chainlink VRF for a given token id
     * @param tokenId id of the token
     * @return requestId id of the request sent to Chainlink
     */
    function requestRandomNumberForTokenId(uint256 tokenId) internal returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = msg.sender;
        requestIdToTokenId[requestId] = tokenId;
        return requestId;
    }

    /**
     * Generate a leaf of the Merkle tree with a nonce and the address of the sender
     * @param nonce nonce to be used
     * @param addr id of the token
     * @return leaf generated
     */
    function generateLeaf(uint256 nonce, address addr) internal pure returns (bytes32 leaf) {
        return keccak256(abi.encodePacked(nonce, addr));
    }

    /**
     * Verifies the proof of the sender to confirm they are in the whitelist
     * @param nonce nonce to be used
     * @param proof proof
     * @return valid TRUE if the proof is valid, FALSE otherwise
     */
    function verifyProof(uint256 nonce, bytes32[] memory proof) internal view returns (bool valid) {
        return MerkleProof.verify(proof, merkleTreeRoot, generateLeaf(nonce, msg.sender));
    }

    /**
     * Returns the token type (god, demi-god, or elemental) given a random number
     * @param randomNumber random number provided
     * @return tokenType a randomly picked token type
     */
    function getTokenType(uint256 randomNumber) private view returns (TokenType tokenType) {
        uint256 godsLeft = GODS_MAX_SUPPLY - godsCounter.current();
        uint256 demiGodsLeft = DEMI_GODS_MAX_SUPPLY - demiGodsCounter.current();
        uint256 elementalsLeft = ELEMENTALS_MAX_SUPPLY - elementalsCounter.current();
        uint256 totalCountLeft = godsLeft + demiGodsLeft + elementalsLeft;
        // Here we add 1 because we use the counts to define the type. If a count is at 0, we ignore it.
        // That's why we don't ever want the modulo to return 0.
        uint256 randomTypeIndex = (randomNumber % totalCountLeft) + 1;
        if (randomTypeIndex <= godsLeft) {
            return TokenType.GOD;
        } else if (randomTypeIndex <= godsLeft + demiGodsLeft) {
            return TokenType.DEMI_GOD;
        } else {
            return TokenType.ELEMENTAL;
        }
    }

    /**
    * Returns the total supply
    * @return count count of NFTs minted so far
    */
    function totalSupply() public view returns (uint256 count) {
        return godsCounter.current() + demiGodsCounter.current() + elementalsCounter.current();
    }

    /**
     * Withdraw balance from the contract
     * TODO Add Reentrancy Guard
     */
    function withdrawAll() public payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }

    /**
     * Modifier that limits the function to WL members only
     * @param nonce nonce to be used
     * @param proof proof
     */
    modifier onlyWhitelist(uint256 nonce, bytes32[] memory proof) {
        require(verifyProof(nonce, proof), "Address is not in the whitelist");
        _;
    }

    /**
     * Modifier that checks if mint is possible
     * @param count number of tokens to mint
     */
    modifier mintable(uint256 count) {
        require((tokenCounter.current() + count) <= MAX_SUPPLY, "Not enough supply");
        require(msg.value >= PRICE, "Not enough ETH");
        _;
    }
}
