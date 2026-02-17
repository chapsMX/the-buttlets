// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TheButtlets is ERC721Enumerable, Ownable, Pausable {
    using ECDSA for bytes32;

    // verifier for off-chain signatures authorizing mints
    address public verifierAddress;

    // Mint price in ETH
    uint256 public mintPrice;

    // tokenId (fid) -> IPFS CID (content-addressed image)
    mapping(uint256 => string) private _tokenCids;
    // wallet -> has minted (enforce 1 per wallet)
    mapping(address => bool) private _walletMinted;

    // Base for image URL construction in tokenURI (e.g., "ipfs://"
    // or "https://<gateway>.mypinata.cloud/ipfs/")
    string public ipfsGatewayBase;

    event Minted(uint256 indexed fid, address indexed to, string cid);
    event TokenCidUpdated(uint256 indexed tokenId, string cid);
    event VerifierAddressUpdated(address indexed verifier);
    event IpfsGatewayBaseUpdated(string base);

    constructor(address initialOwner)
        ERC721("TheButtles", "BUTTlet")
        Ownable(initialOwner)
    {
        mintPrice = 0.00037 ether;
        ipfsGatewayBase = "ipfs://";
    }

    // ============ Owner controls ============

    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }

    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setVerifierAddress(address _verifierAddress) external onlyOwner {
        verifierAddress = _verifierAddress;
        emit VerifierAddressUpdated(_verifierAddress);
    }

    function setIpfsGatewayBase(string memory _base) external onlyOwner {
        ipfsGatewayBase = _base;
        emit IpfsGatewayBaseUpdated(_base);
    }

    function updateTokenCid(uint256 tokenId, string memory cid) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _tokenCids[tokenId] = cid;
        emit TokenCidUpdated(tokenId, cid);
    }

    function withdrawFunds() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    // ============ Minting ============

    // Signature schema (EIP-191 style):
    // keccak256(abi.encode(
    //   keccak256("WarpletAIMint(uint256 fid,address recipient,string cid,address contractAddress,uint256 chainId,uint256 deadline)"),
    //   fid,
    //   recipient,
    //   keccak256(bytes(cid)),
    //   contractAddress,
    //   chainId,
    //   deadline
    // ))
    //
    // ethSigned = MessageHashUtils.toEthSignedMessageHash(message)
    //
    // Verify recovered signer == verifierAddress
    function mint(
        uint256 fid,
        string memory cid,
        uint256 deadline,
        bytes memory signature
    ) external payable whenNotPaused {
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(block.timestamp <= deadline, "Signature expired");
        require(!_tokenMinted(fid), "Token already minted");
        require(!_walletMinted[msg.sender], "Only 1 token per wallet");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(
            verifierAddress == address(0) || _verifyMintSignature(fid, msg.sender, cid, deadline, signature),
            "Invalid signature"
        );

        _safeMint(msg.sender, fid);
        _walletMinted[msg.sender] = true;
        _tokenCids[fid] = cid;

        emit Minted(fid, msg.sender, cid);
    }

    function _tokenMinted(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function _verifyMintSignature(
        uint256 fid,
        address recipient,
        string memory cid,
        uint256 deadline,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 typeHash = keccak256(
            "WarpletAIMint(uint256 fid,address recipient,string cid,address contractAddress,uint256 chainId,uint256 deadline)"
        );
        bytes32 message = keccak256(
            abi.encode(
                typeHash,
                fid,
                recipient,
                keccak256(bytes(cid)),
                address(this),
                block.chainid,
                deadline
            )
        );
        bytes32 ethSigned = MessageHashUtils.toEthSignedMessageHash(message);
        address recoveredSigner = ECDSA.recover(ethSigned, signature);
        return recoveredSigner == verifierAddress && recipient == msg.sender;
    }

    // ============ Views ============

    function imgCid(uint256 tokenId) external view returns (string memory) {
        return _tokenCids[tokenId];
    }

    function imageUrl(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        string memory cid = _tokenCids[tokenId];
        require(bytes(cid).length > 0, "CID not set");
        return string(abi.encodePacked(ipfsGatewayBase, cid));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        string memory cid = _tokenCids[tokenId];
        require(bytes(cid).length > 0, "CID not set for token");

        string memory imgURL = string(abi.encodePacked(ipfsGatewayBase, cid));

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name":"The Buttlet #',
                        _toString(tokenId),
                        '","description":"Turning Warplets into Buttlets.","image":"',
                        imgURL,
                        '","attributes":[{"trait_type":"Collection","value":"The Buttlets"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // ============ Utils ============

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

/// [MIT License]
/// @title Base64
/// @notice Provides a function for encoding some bytes in base64
/// @author Brecht Devos <brecht@loopring.org>
library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    /// @notice Encodes some bytes to the base64 representation
    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        // multiply by 4/3 rounded up
        uint256 encodedLen = 4 * ((len + 2) / 3);

        // Add some extra buffer at the end
        bytes memory result = new bytes(encodedLen + 32);

        bytes memory table = TABLE;

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let i := 0
            } lt(i, len) {

            } {
                i := add(i, 3)
                let input := and(mload(add(data, i)), 0xffffff)

                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 0xFF))
                out := shl(224, out)

                mstore(resultPtr, out)

                resultPtr := add(resultPtr, 4)
            }

            switch mod(len, 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }

            mstore(result, encodedLen)
        }

        return string(result);
    }
}