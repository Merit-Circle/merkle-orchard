// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    // solhint-disable-next-line
    constructor() ERC20("MOCK", "MOCK") {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
