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
    uint256 public constant WHITELIST_MINT_COUNT = 1;
    uint256 public constant GODS_MAX_SUPPLY = 50;
    uint256 public constant DEMI_GODS_MAX_SUPPLY = 400;
    uint256 public constant ELEMENTALS_MAX_SUPPLY = 550;
    uint256 public constant RESERVED_GODS_MAX_SUPPLY = 10;
    bool public mintActive = false;
    string public baseTokenURI;
    Counters.Counter private tokenCounter;
    Counters.Counter private randomNumberRequestsCounter;
    Counters.Counter private godsCounter;
    Counters.Counter private demiGodsCounter;
    Counters.Counter private elementalsCounter;
    Counters.Counter private reservedGodsTransfered;

    /**
     * Minting properties
     */
    mapping(address => uint256) private addressToMintCount;
    mapping(address => uint256) private addressToRequestCount;
    bytes32 private whiteListMerkleTreeRoot;
    bytes32 private freeMintMerkleTreeRoot;
    mapping(uint256 => TokenTraits) public tokenIdToTraits;

    constructor(address vrfCoordinator, address linkToken, bytes32 _keyhash, string memory baseURI) VRFConsumerBase(vrfCoordinator, linkToken) ERC721("Mythical Sega", "MS") {
        tokenCounter.increment();   // we want to start the counter at 1
        setBaseURI(baseURI);
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
        
        // reserve 10 gods for owner
        for (uint256 i=0; i < RESERVED_GODS_MAX_SUPPLY; i++) {
            godsCounter.increment();
            tokenCounter.increment();
        }
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
    function setWhiteListMerkleTreeRoot(bytes32 _whiteListMerkleTreeRoot) public onlyOwner {
        whiteListMerkleTreeRoot = _whiteListMerkleTreeRoot;
    }
    function setFreeMintMerkleTreeRoot(bytes32 _freeMintMerkleTreeRoot) public onlyOwner {
        freeMintMerkleTreeRoot = _freeMintMerkleTreeRoot;
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
     * @param sender sender of the request 
     */
    function requestMint(address sender) private {
        addressToRequestCount[sender]++;
        bytes32 requestId = requestRandomNumberForTokenId(sender, tokenCounter.current() + randomNumberRequestsCounter.current());
        randomNumberRequestsCounter.increment();
        emit RequestedRandomNFT(requestId);
    }

    /**
     * Free mint
     * @param count number of tokens to mint
     * @param maxMintCount maximum number of tokens the user can mint. Also used as a nonce to validate the proof.
     * @param proof Proof to verify that the caller is allowed to mint
     */
    function freeMint(uint count, uint256 maxMintCount, bytes32[] calldata proof) public whenNotPaused() onlyFreeMint(maxMintCount, proof) {
        require((tokenCounter.current() + count) <= MAX_SUPPLY, "Not enough supply");
        uint mintCount = addressToMintCount[msg.sender] + addressToRequestCount[msg.sender] + count;
        require(mintCount <= maxMintCount, "Trying to mint more than allowed");
        for (uint256 i=0; i < count; i++) {
            requestMint(msg.sender);
        }
    }

    /**
     * Whitelist mint
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     */
    function mintWhitelist(uint256 nonce, bytes32[] calldata proof) public payable whenNotPaused() onlyWhitelist(nonce, proof) {
        require((tokenCounter.current() + WHITELIST_MINT_COUNT) <= MAX_SUPPLY, "Not enough supply");
        require(msg.value >= PRICE, "Not enough ETH");
        require((addressToMintCount[msg.sender] + addressToRequestCount[msg.sender]) < WHITELIST_MINT_COUNT, "Already minted");
        requestMint(msg.sender);
    }

    /**
     * Requests a random number to Chainlink VRF for a given token id
     * @param sender sender of the request 
     * @param tokenId id of the token
     * @return requestId id of the request sent to Chainlink
     */
    function requestRandomNumberForTokenId(address sender, uint256 tokenId) internal returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = sender;
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
     * Verifies the proof of the sender to confirm they are in given list
     * @param nonce nonce to be used
     * @param root Merkle tree root
     * @param proof proof
     * @return valid TRUE if the proof is valid, FALSE otherwise
     */
    function verifyProof(uint256 nonce, bytes32 root, bytes32[] memory proof) internal view returns (bool valid) {
        return MerkleProof.verify(proof, root, generateLeaf(nonce, msg.sender));
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
    * Returns the number of reserved gods left
    * @return count the amount of reserved gods left
    */
    function reservedGodsSupply() public view onlyOwner returns (uint256 count) {
        return RESERVED_GODS_MAX_SUPPLY - reservedGodsTransfered.current();
    }

    /**
    * Mint reserved gods
    * @param to address to send the god to
    * @param count number of gods to transfer
    */
    function mintReservedGods(address to, uint256 count) public onlyOwner {
        require(reservedGodsSupply() >= count, "Not enough reserved gods left");
        for (uint256 i=0; i < count; i++) {
            reservedGodsTransfered.increment();
            mintGod(to, reservedGodsTransfered.current());
        }
    }

    /**
     * Modifier that limits the function to whitelist members only
     * @param nonce nonce to be used
     * @param proof proof
     */
    modifier onlyWhitelist(uint256 nonce, bytes32[] memory proof) {
        require(verifyProof(nonce, whiteListMerkleTreeRoot, proof), "Address is not in the whitelist");
        _;
    }

    /**
     * Modifier that limits the function to free mint list members only
     * @param nonce nonce to be used
     * @param proof proof
     */
    modifier onlyFreeMint(uint256 nonce, bytes32[] memory proof) {
        require(verifyProof(nonce, freeMintMerkleTreeRoot, proof), "Address is not in the free mint list");
        _;
    }
}
