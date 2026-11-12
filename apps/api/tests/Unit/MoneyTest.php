<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_basis_points_use_integer_floor_division(): void
    {
        $this->assertSame(1000, Money::commissionMinor(10_000, 1000));
        $this->assertSame(19, Money::commissionMinor(199, 1000)); // floor(199*1000/10000)
        $this->assertSame(105, Money::commissionMinor(1000, 1000, 5)); // 100 + 5 flat
    }

    public function test_proportional_minor_uses_integer_floor_division(): void
    {
        $this->assertSame(50, Money::proportionalMinor(100, 500, 1000));
        $this->assertSame(33, Money::proportionalMinor(100, 1, 3)); // intdiv(100, 3)
        $this->assertSame(0, Money::proportionalMinor(100, 0, 1000));
        $this->assertSame(100, Money::proportionalMinor(100, 1, 0)); // whole clamped to 1
    }
}
