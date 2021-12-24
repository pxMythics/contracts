//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract GenesisSupply is AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    enum TokenType {
        GOD,
        DEMI_GOD,
        ELEMENTAL
    }

    struct TokenTraits {
        TokenType tokenType;
        // TODO add other traits
    }

    /**
     * Supply
     */
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant GODS_MAX_SUPPLY = 50;
    uint256 public constant DEMI_GODS_MAX_SUPPLY = 400;
    uint256 public constant ELEMENTALS_MAX_SUPPLY = 550;
    uint256 public constant RESERVED_GODS_MAX_SUPPLY = 10;

    /**
     * Counters
     */
    Counters.Counter private tokenCounter;
    Counters.Counter private godsCounter;
    Counters.Counter private demiGodsCounter;
    Counters.Counter private elementalsCounter;
    Counters.Counter private reservedGodsTransfered;

    /**
     * Minting properties
     */
    mapping(uint256 => TokenTraits) private tokenIdToTraits;
    mapping(address => uint256) private addressToMintCount;

    /**
     * Utils
     */
    bool public isRevealed;
    bytes32 public constant GENESIS_ROLE = keccak256("GENESIS_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // TODO start other counters at 1 to save on gas
        isRevealed = false;
        // reserve 10 gods for owner
        for (uint256 i = 0; i < RESERVED_GODS_MAX_SUPPLY; i++) {
            godsCounter.increment();
            tokenCounter.increment();
        }
    }

    /**
     * Setters
     */
    function setIsRevealed(bool _isRevealed) external onlyRole(GENESIS_ROLE) {
        isRevealed = _isRevealed;
    }

    /**
     * Getters
     */
    /**
     * Returns the total supply
     * @return count count of NFTs minted so far
     */
    function totalSupply() public view returns (uint256 count) {
        return
            godsCounter.current() +
            demiGodsCounter.current() +
            elementalsCounter.current();
    }

    function mintCount(address to)
        external
        view
        onlyRole(GENESIS_ROLE)
        returns (uint256 count)
    {
        return addressToMintCount[to];
    }

    /**
     * Returns the number of reserved gods left
     * @return count the amount of reserved gods left
     */
    function reservedGodsSupply()
        public
        view
        onlyRole(GENESIS_ROLE)
        returns (uint256 count)
    {
        return RESERVED_GODS_MAX_SUPPLY - reservedGodsTransfered.current();
    }

    /**
     * Mint a god
     * @param tokenId id of the token to be minted
     */
    function mintGod(uint256 tokenId) private {
        require(
            godsCounter.current() < GODS_MAX_SUPPLY,
            "Not enough gods left"
        );
        godsCounter.increment();
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.GOD);
    }

    /**
     * Mint a demi-god
     * @param tokenId id of the token to be minted
     * @param randomNumber random number used to generate traits
     */
    function mintDemiGod(uint256 tokenId, uint256 randomNumber) private {
        require(
            demiGodsCounter.current() < DEMI_GODS_MAX_SUPPLY,
            "Not enough demi-gods left"
        );
        demiGodsCounter.increment();
        // TODO add other traits
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.DEMI_GOD);
    }

    /**
     * Mint an elemental
     * @param tokenId id of the token to be minted
     * @param randomNumber random number used to generate traits
     */
    function mintElemental(uint256 tokenId, uint256 randomNumber) private {
        require(
            elementalsCounter.current() < ELEMENTALS_MAX_SUPPLY,
            "Not enough elementals left"
        );
        elementalsCounter.increment();
        // TODO add other traits
        tokenIdToTraits[tokenId] = TokenTraits(TokenType.ELEMENTAL);
    }

    /**
     * Mint a token
     * @param to address of the NFT owner
     * @param seed Seed for the random number to be generated
     */
    function mint(address to, uint256 seed)
        public
        onlyRole(GENESIS_ROLE)
        returns (uint256)
    {
        require(tokenCounter.current() < MAX_SUPPLY, "Not enough supply");
        uint256 tokenId = tokenCounter.current();
        uint256 randomNumber = generateRandomNumber(seed, tokenId);
        tokenCounter.increment();
        addressToMintCount[to]++; // we use ++ directly because it's never gonna overflow, because amount of mints are limited
        TokenType tokenType = getTokenType(randomNumber);
        if (tokenType == TokenType.GOD) {
            mintGod(tokenId);
        } else if (tokenType == TokenType.DEMI_GOD) {
            mintDemiGod(tokenId, randomNumber);
        } else {
            mintElemental(tokenId, randomNumber);
        }
        return tokenId;
    }

    /**
     * @dev Generates a uint256 random number from seed, nonce and transaction block
     * @param seed The seed to be used for the randomization
     * @param nonce The nonce to be used for the randomization
     * @return randomNumber random number generated
     */
    function generateRandomNumber(uint256 seed, uint256 nonce)
        private
        view
        returns (uint256 randomNumber)
    {
        return
            uint256(keccak256(abi.encodePacked(block.timestamp, nonce, seed)));
    }

    /**
     * Returns the token type (god, demi-god, or elemental) given a random number
     * @param randomNumber random number provided
     * @return tokenType a randomly picked token type
     */
    function getTokenType(uint256 randomNumber)
        private
        view
        returns (TokenType tokenType)
    {
        uint256 godsLeft = GODS_MAX_SUPPLY - godsCounter.current();
        uint256 demiGodsLeft = DEMI_GODS_MAX_SUPPLY - demiGodsCounter.current();
        uint256 elementalsLeft = ELEMENTALS_MAX_SUPPLY -
            elementalsCounter.current();
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
     * Returns the metadata of a token
     * @param tokenId id of the token
     * @return traits metadata of the token
     * FIXME We need to adjust the modifier and reveal date
     */
    function getMetadataForTokenId(uint256 tokenId)
        public
        view
        validTokenId(tokenId)
        returns (TokenTraits memory traits)
    {
        // Backend has access to metadata before anyone
        if (hasRole(BACKEND_ROLE, msg.sender)) {
            return tokenIdToTraits[tokenId];
        }
        if (isRevealed) {
            return tokenIdToTraits[tokenId];
        }
        revert("Not revealed yet");
    }

    /**
     * Modifier that checks for a valid tokenId
     * @param tokenId token id
     */
    modifier validTokenId(uint256 tokenId) {
        require(tokenId < MAX_SUPPLY, "Invalid tokenId");
        require(tokenId > 0, "Invalid tokenId");
        _;
    }
}
