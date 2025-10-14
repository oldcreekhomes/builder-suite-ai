{
  isExtracting ? (
    <div className="h-64 flex items-center justify-center rounded-md border bg-muted/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>
          Processing {extractingCount} PDF{extractingCount !== 1 ? "s" : ""}...
        </span>
      </div>
    </div>
  ) : batchBills.length === 0 ? (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Bills</CardTitle>
        <CardDescription>Upload PDF files above to extract bill data automatically</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No bills uploaded yet</p>
          <p className="text-sm">Upload PDF files above to extract bill data automatically</p>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Extracted Bills</CardTitle>
            <CardDescription>
              Review and edit {batchBills.length} bill{batchBills.length > 1 ? "s" : ""} before submitting
            </CardDescription>
          </div>
          <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="lg">
            {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <BatchBillReviewTable
          bills={batchBills}
          onBillUpdate={handleBillUpdate}
          onBillDelete={handleBillDelete}
          onLinesUpdate={handleLinesUpdate}
          selectedBillIds={selectedBillIds}
          onBillSelect={handleBillSelect}
          onSelectAll={handleSelectAll}
          showProjectColumn={!effectiveProjectId}
        />
      </CardContent>
    </Card>
  );
}
